<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\Cart\CartService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    public function __construct(private readonly CartService $cart) {}

    public function index(): Response
    {
        // Items that sold out after being added get up to three in-stock substitutes each.
        $alternatives = $this->cart->lines()
            ->filter(fn (array $line) => $line['product']->orderableLimit() < $line['quantity'])
            ->mapWithKeys(fn (array $line) => [$line['product']->id => $line['product']->alternatives(3)->map->toCard()->values()]);

        return Inertia::render('Cart/Index', ['cart' => $this->cart->summary(), 'alternatives' => $alternatives]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $product = Product::findOrFail($data['product_id']);
        if ($product->orderableLimit() === 0) {
            return back()->with('error', "{$product->name} is out of stock right now.");
        }

        $before = $this->cart->raw()[$product->id] ?? 0;
        $after = $this->cart->add($product, $data['quantity'] ?? 1);

        return back()->with($after > $before ? 'success' : 'error', $after > $before
            ? "Added to your bag — {$product->name}"
            : "You already have the maximum allowed quantity of {$product->name}.");
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $data = $request->validate(['quantity' => ['required', 'integer', 'min:0', 'max:50']]);
        $this->cart->set($product, $data['quantity']);

        return back();
    }

    public function destroy(Product $product): RedirectResponse
    {
        $this->cart->remove($product);

        return back()->with('success', "Removed {$product->name}.");
    }
}
