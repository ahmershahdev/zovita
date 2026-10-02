<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\Cart\CartService;
use App\Services\Personalization\Interactions;
use App\Services\Security\ActivityLog;
use App\Services\Wishlist\WishlistService;
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

    public function store(Request $request, Interactions $interactions): RedirectResponse
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
        if ($after > $before) {
            $interactions->cartAdd($product);
            ActivityLog::record('cart.add', "Added {$product->name} to the bag");
        }

        return back()->with($after > $before ? 'success' : 'error', $after > $before
            ? __('Added to your bag — :name', ['name' => $product->name])
            : "You already have the maximum allowed quantity of {$product->name}.");
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $data = $request->validate(['quantity' => ['required', 'integer', 'min:0', 'max:50']]);
        $this->cart->set($product, $data['quantity']);

        return back();
    }

    /** Bag → wishlist: keep the item for later without leaving it in the order. */
    public function saveForLater(Product $product, WishlistService $wishlist): RedirectResponse
    {
        $wishlist->add($product);
        $this->cart->remove($product);

        return back()->with('success', __('Saved for later — :name', ['name' => $product->name]));
    }

    public function destroy(Product $product): RedirectResponse
    {
        $this->cart->remove($product);

        return back()->with('success', __('Removed :name.', ['name' => $product->name]));
    }
}
