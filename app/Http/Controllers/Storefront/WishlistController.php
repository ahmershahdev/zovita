<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Product;
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

        return back()->with('success', $saved ? 'Saved to your wishlist.' : 'Removed from your wishlist.');
    }
}
