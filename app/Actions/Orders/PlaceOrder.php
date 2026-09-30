<?php

namespace App\Actions\Orders;

use App\Actions\Prescriptions\StorePrescription;
use App\Enums\OrderStatus;
use App\Mail\OrderPlacedMail;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\Cart\CartService;
use App\Services\Mail\TransactionalMailer;
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
 * The loser of a race gets a normal validation error asking them to review the bag.
 */
class PlaceOrder
{
    public function __construct(
        private readonly CartService $cart,
        private readonly StorePrescription $storePrescription,
        private readonly TransactionalMailer $mailer,
    ) {}

    /**
     * @param  array{name: string, email: string, phone: string, address: string, city: string, postal_code?: ?string, notes?: ?string}  $details
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

        try {
            $order = DB::transaction(function () use ($items, $details, $user, $prescriptionFile, $token, &$prescription) {
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

                if ($needsPrescription && ! $prescriptionFile) {
                    throw ValidationException::withMessages([
                        'prescription' => 'Your bag contains prescription medicine. Please attach a valid prescription.',
                    ]);
                }

                $prescription = $prescriptionFile
                    ? $this->storePrescription->handle($prescriptionFile, $details, $user, notify: false)
                    : null;

                $deliveryFee = $payable >= config('zovita.free_delivery_over') ? 0 : (int) config('zovita.delivery_fee');

                $order = $this->createWithUniqueNumber([
                    'user_id' => $user?->id,
                    'prescription_id' => $prescription?->id,
                    'checkout_token' => $token,
                    'status' => OrderStatus::Pending,
                    'customer_name' => $details['name'],
                    'email' => $details['email'],
                    'phone' => $details['phone'],
                    'address' => $details['address'],
                    'city' => $details['city'],
                    'postal_code' => $details['postal_code'] ?? null,
                    'notes' => $details['notes'] ?? null,
                    'payment_method' => 'cod',
                    'subtotal' => round($subtotal, 2),
                    'savings' => round($subtotal - $payable, 2),
                    'delivery_fee' => $deliveryFee,
                    'total' => round($payable + $deliveryFee, 2),
                ]);
                $order->items()->createMany($lines);

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

        $this->mailer->send($order->email, new OrderPlacedMail($order));
        $this->mailer->toTeam(new OrderPlacedMail($order, forTeam: true));

        return $order;
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
