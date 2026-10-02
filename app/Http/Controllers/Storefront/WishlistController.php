<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\Cart\CartService;
use App\Services\Security\ActivityLog;
use App\Services\Wishlist\WishlistService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class WishlistController extends Controller
{
    public function __construct(private readonly WishlistService $wishlist) {}

    public function index(): Response
    {
        $ids = $this->wishlist->ids();

        return Inertia::render('Wishlist/Index', [
            'products' => Product::with('brand', 'category')->whereIn('id', $ids)->get()->map->toCard(),
        ]);
    }

    public function toggle(Product $product): RedirectResponse
    {
        $saved = $this->wishlist->toggle($product);
        ActivityLog::record('wishlist', ($saved ? 'Saved ' : 'Removed ').$product->name.($saved ? ' to' : ' from').' the wishlist');

        return back()->with('success', $saved ? __('Saved to your wishlist.') : __('Removed from your wishlist.'));
    }

    /** Wishlist → bag in one step. A sold-out item stays saved so it is not lost. */
    public function moveToBag(Product $product, CartService $cart): RedirectResponse
    {
        if ($product->orderableLimit() === 0) {
            return back()->with('error', "{$product->name} is out of stock right now — it stays in your wishlist.");
        }

        $cart->add($product, 1);
        $this->wishlist->remove($product);

        return back()->with('success', __('Moved to your bag — :name', ['name' => $product->name]));
    }
}
