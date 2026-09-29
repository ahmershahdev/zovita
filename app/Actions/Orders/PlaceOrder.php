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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
    public function handle(array $details, ?User $user, ?UploadedFile $prescriptionFile = null): Order
    {
        $items = $this->cart->raw();
        if ($items === []) {
            throw ValidationException::withMessages(['cart' => 'Your bag is empty.']);
        }

        $order = DB::transaction(function () use ($items, $details, $user, $prescriptionFile) {
            // Lock rows so two customers cannot buy the last unit at the same time.
            $products = Product::whereIn('id', array_keys($items))->lockForUpdate()->get()->keyBy('id');

            $subtotal = 0;
            $payable = 0;
            $lines = [];
            $needsPrescription = false;

            foreach ($items as $productId => $quantity) {
                $product = $products->get($productId);
                if (! $product || $quantity > $product->orderableLimit()) {
                    throw ValidationException::withMessages([
                        'cart' => ($product?->name ?? 'An item').' is no longer available in that quantity. Please review your bag.',
                    ]);
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

                $product->decrement('stock', $quantity);
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

            $order = Order::create([
                'user_id' => $user?->id,
                'prescription_id' => $prescription?->id,
                'number' => Order::generateNumber(),
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
        });

        $this->cart->clear();

        $this->mailer->send($order->email, new OrderPlacedMail($order));
        $this->mailer->toTeam(new OrderPlacedMail($order, forTeam: true));

        return $order;
    }
}
