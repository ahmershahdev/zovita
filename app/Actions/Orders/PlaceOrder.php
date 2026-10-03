<?php

namespace App\Actions\Orders;

use App\Actions\Prescriptions\StorePrescription;
use App\Enums\OrderStatus;
use App\Mail\OrderPlacedMail;
use App\Models\Offer;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\Cart\CartService;
use App\Services\Catalog\InteractionChecker;
use App\Services\Experiments\Experiments;
use App\Services\Mail\TransactionalMailer;
use App\Services\Personalization\Interactions;
use App\Services\Personalization\OfferEngine;
use App\Services\Personalization\Pricing;
use App\Services\Personalization\Visitor;
use App\Services\Security\ActivityLog;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Turns the bag into an order. Concurrency guarantees (e.g. one unit left, two buyers):
 *
 *  1. Rows are locked with SELECT … FOR UPDATE in ascending id order, so two checkouts touching the
 *     same products queue behind each other instead of deadlocking.
 *  2. Stock is re-checked under the lock and decremented with a conditional UPDATE
 *     (`WHERE stock >= qty`); if it affects no row the whole transaction rolls back. Stock can
 *     therefore never go negative, even if the lock were bypassed.
 *  3. The transaction is retried on deadlock/serialization failures.
 *  4. A per-checkout token (unique index) makes a double-click or network retry return the order
 *     that was already placed instead of creating a second one.
 *  5. Order numbers are random with a unique index; a collision simply retries.
 *  6. Card orders are created "awaiting payment" with their stock reserved; PaymentService confirms
 *     them from a verified webhook (then confirmed() runs) or expires and restocks them.
 *  7. Drug-interaction warnings are recomputed from the locked products and stored on the order for
 *     the pharmacist; a "major" one must have been acknowledged by the customer.
 * The loser of a race gets a normal validation error asking them to review the bag.
 */
class PlaceOrder
{
    public function __construct(
        private readonly CartService $cart,
        private readonly StorePrescription $storePrescription,
        private readonly TransactionalMailer $mailer,
        private readonly Visitor $visitor,
        private readonly Interactions $interactions,
        private readonly InteractionChecker $interactionChecker,
    ) {}

    /**
     * @param  array{name: string, email: string, phone: string, address: string, city: string, postal_code?: ?string, notes?: ?string, payment_method?: string, interactions_ack?: bool}  $details
     */
    public function handle(array $details, ?User $user, ?UploadedFile $prescriptionFile = null, ?string $token = null): Order
    {
        if ($token && ($existing = Order::where('checkout_token', $token)->first())) {
            return $existing;
        }

        $items = $this->cart->raw();
        if ($items === []) {
            throw ValidationException::withMessages(['cart' => 'Your bag is empty.']);
        }
        ksort($items);

        // Set inside the transaction; if it rolls back, the stored file is deleted again below.
        $prescription = null;
        $visitor = $this->visitor->key();
        $card = ($details['payment_method'] ?? 'cod') === 'card';
        $acknowledged = (bool) ($details['interactions_ack'] ?? false);

        try {
            $order = DB::transaction(function () use ($items, $details, $user, $prescriptionFile, $token, $visitor, $card, $acknowledged, &$prescription) {
                $products = Product::whereIn('id', array_keys($items))->orderBy('id')->lockForUpdate()->get()->keyBy('id');

                $subtotal = 0;
                $payable = 0;
                $lines = [];
                $needsPrescription = false;

                foreach ($items as $productId => $quantity) {
                    $product = $products->get($productId);
                    if (! $product || $quantity > $product->orderableLimit()) {
                        throw $this->soldOut($product);
                    }

                    $needsPrescription = $needsPrescription || $product->requires_prescription;
                    $subtotal += $product->price * $quantity;
                    $payable += $product->current_price * $quantity;
                    $lines[] = [
                        'product_id' => $product->id,
                        'name' => $product->name,
                        'slug' => $product->slug,
                        'image' => $product->image,
                        'unit_price' => $product->current_price,
                        'quantity' => $quantity,
                        'line_total' => round($product->current_price * $quantity, 2),
                    ];

                    $updated = Product::whereKey($product->id)->where('stock', '>=', $quantity)->decrement('stock', $quantity);
                    if ($updated !== 1) {
                        throw $this->soldOut($product);
                    }
                }

                $warnings = $this->interactionChecker->check($products->values());
                if (InteractionChecker::hasMajor($warnings) && ! $acknowledged) {
                    throw ValidationException::withMessages([
                        'interactions_ack' => 'Some medicines in your bag should not normally be taken together. Please read the warning and tick the box to continue.',
                    ]);
                }

                if ($needsPrescription && ! $prescriptionFile) {
                    throw ValidationException::withMessages([
                        'prescription' => 'Your bag contains prescription medicine. Please attach a valid prescription.',
                    ]);
                }

                $prescription = $prescriptionFile
                    ? $this->storePrescription->handle($prescriptionFile, $details, $user, notify: false)
                    : null;

                // Personal offers: re-read and locked here so one offer can never be redeemed by two
                // parallel checkouts, then priced by the same function the bag preview uses.
                $offers = Offer::where('visitor', $visitor)->active()->lockForUpdate()->get();
                $personal = Pricing::apply(
                    collect($items)->map(fn ($qty, $id) => ['product' => $products[$id], 'quantity' => $qty])->values(),
                    $offers,
                );

                $deliveryFee = $payable >= config('zovita.free_delivery_over') ? 0 : (int) config('zovita.delivery_fee');

                $order = $this->createWithUniqueNumber([
                    'user_id' => $user?->id,
                    'prescription_id' => $prescription?->id,
                    'checkout_token' => $token,
                    'status' => $card ? OrderStatus::AwaitingPayment : OrderStatus::Pending,
                    'visitor' => $visitor,
                    'payment_status' => $card ? 'pending' : 'unpaid',
                    'payment_expires_at' => $card ? now()->addMinutes((int) config('payments.expires_minutes', 30)) : null,
                    'interaction_warnings' => $warnings ?: null,
                    'customer_name' => $details['name'],
                    'email' => $details['email'],
                    'phone' => $details['phone'],
                    'address' => $details['address'],
                    'city' => $details['city'],
                    'postal_code' => $details['postal_code'] ?? null,
                    'notes' => $details['notes'] ?? null,
                    'payment_method' => $card ? 'card' : 'cod',
                    'subtotal' => round($subtotal, 2),
                    'savings' => round($subtotal - $payable, 2),
                    'offer_discount' => $personal['discount'],
                    'delivery_fee' => $deliveryFee,
                    'total' => round($payable - $personal['discount'] + $deliveryFee, 2),
                ]);
                $order->items()->createMany($lines);
                if ($personal['used']) {
                    Offer::whereKey($personal['used'])->update(['redeemed_at' => now(), 'order_id' => $order->id]);
                }

                return $order;
            }, attempts: 3);
        } catch (UniqueConstraintViolationException $e) {
            // Same checkout token committed by a parallel request: return that order.
            $this->discard($prescription);
            if ($token && ($existing = Order::where('checkout_token', $token)->first())) {
                return $existing;
            }
            throw $e;
        } catch (Throwable $e) {
            $this->discard($prescription);
            throw $e;
        }

        $this->cart->clear();
        OfferEngine::forget($visitor);
        ActivityLog::record('order.placed', "Placed order {$order->number} (PKR ".number_format($order->total).', '.($card ? 'card' : 'cash on delivery').')', $user, ['order' => $order->number]);

        // Cash on delivery is confirmed now; a card order only once its payment webhook arrives.
        if (! $card) {
            $this->confirmed($order);
        }

        return $order;
    }

    /**
     * Everything that should only happen for a real order: purchase signals for personalisation,
     * A/B conversions and the e-mails. Runs once per order (COD at checkout, card when paid).
     */
    public function confirmed(Order $order): void
    {
        $order->loadMissing('items');
        $quantities = $order->items->whereNotNull('product_id')->groupBy('product_id')->map->sum('quantity')->all();
        $visitor = $order->visitor ?? ($order->user_id ? 'u:'.$order->user_id : null);
        if ($visitor) {
            $this->interactions->purchased($quantities, $visitor, $order->user_id);
            OfferEngine::forget($visitor);
            app(Experiments::class)->trackAll('purchase', $visitor);
        }
        $this->mailer->send($order->email, new OrderPlacedMail($order));
        $this->mailer->toTeam(new OrderPlacedMail($order, forTeam: true));
    }

    private function createWithUniqueNumber(array $attributes): Order
    {
        for ($attempt = 1; ; $attempt++) {
            try {
                // Savepoint, so a number collision doesn't abort the surrounding transaction.
                return DB::transaction(fn () => Order::create($attributes + ['number' => Order::generateNumber()]));
            } catch (UniqueConstraintViolationException $e) {
                if ($attempt >= 5 || str_contains($e->getMessage(), 'checkout_token')) {
                    throw $e;
                }
            }
        }
    }

    private function soldOut(?Product $product): ValidationException
    {
        return ValidationException::withMessages([
            'cart' => ($product?->name ?? 'An item').' is no longer available in that quantity. Please review your bag.',
        ]);
    }

    private function discard($prescription): void
    {
        if ($prescription?->file_path) {
            Storage::disk(config('zovita.prescriptions.disk'))->delete($prescription->file_path);
        }
    }
}
