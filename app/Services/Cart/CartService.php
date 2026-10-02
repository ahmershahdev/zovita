<?php

namespace App\Services\Cart;

use App\Models\Product;
use App\Services\Personalization\OfferEngine;
use App\Services\Personalization\Pricing;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Collection;

/**
 * Session-backed cart. Stores only product ids and quantities; prices are always
 * re-read from the database so a tampered session can never change what is charged.
 */
class CartService
{
    private const KEY = 'cart.items';

    public function __construct(private readonly Session $session) {}

    /** @return array<int, int> product id => quantity */
    public function raw(): array
    {
        $items = $this->session->get(self::KEY, []);

        return is_array($items) ? array_filter(array_map('intval', $items), fn ($q) => $q > 0) : [];
    }

    public function count(): int
    {
        return array_sum($this->raw());
    }

    public function isEmpty(): bool
    {
        return $this->raw() === [];
    }

    public function add(Product $product, int $quantity = 1): int
    {
        $items = $this->raw();

        return $this->set($product, ($items[$product->id] ?? 0) + $quantity);
    }

    /** Sets a line quantity, clamped to what can actually be ordered. Returns the stored quantity. */
    public function set(Product $product, int $quantity): int
    {
        $items = $this->raw();
        $quantity = min(max(0, $quantity), $product->orderableLimit());

        if ($quantity === 0) {
            unset($items[$product->id]);
        } else {
            $items[$product->id] = $quantity;
        }

        $this->session->put(self::KEY, $items);

        return $quantity;
    }

    public function remove(Product $product): void
    {
        $this->set($product, 0);
    }

    public function clear(): void
    {
        $this->session->forget(self::KEY);
    }

    /** @return Collection<int, array{product: Product, quantity: int}> */
    public function lines(): Collection
    {
        $items = $this->raw();
        if ($items === []) {
            return collect();
        }

        $products = Product::with('brand', 'category')->whereIn('id', array_keys($items))->get()->keyBy('id');

        return collect($items)
            ->filter(fn ($qty, $id) => $products->has($id))
            ->map(fn ($qty, $id) => ['product' => $products[$id], 'quantity' => $qty])
            ->values();
    }

    public function summary(): array
    {
        $lines = $this->lines();
        $subtotal = $lines->sum(fn ($l) => $l['product']->price * $l['quantity']);
        $payable = $lines->sum(fn ($l) => $l['product']->current_price * $l['quantity']);
        $freeOver = (int) config('zovita.free_delivery_over');
        // Free delivery is judged before personal offers, so a discount never costs the customer delivery.
        $delivery = $lines->isEmpty() || $payable >= $freeOver ? 0 : (int) config('zovita.delivery_fee');

        $offers = $lines->isEmpty() ? collect() : app(OfferEngine::class)->active();
        $personal = Pricing::apply($lines, $offers);
        $applied = $offers->whereIn('id', $personal['used'])->map->toClient()->values()->all();

        return [
            'lines' => $lines->map(fn ($l) => $l['product']->toCard() + [
                'quantity' => $l['quantity'],
                'line_total' => round($l['product']->current_price * $l['quantity'], 2),
                'offer_discount' => $personal['lines'][$l['product']->id] ?? 0,
            ])->all(),
            'count' => $lines->sum('quantity'),
            'subtotal' => round($subtotal, 2),
            'savings' => round($subtotal - $payable, 2),
            'offer_discount' => $personal['discount'],
            'offers' => $applied,
            'delivery_fee' => $delivery,
            'free_delivery_over' => $freeOver,
            'total' => round($payable - $personal['discount'] + $delivery, 2),
            'requires_prescription' => $lines->contains(fn ($l) => $l['product']->requires_prescription),
        ];
    }
}
