<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Product;
use App\Services\Catalog\ProductFilters;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ShopController extends Controller
{
    public function index(Request $request, ?Department $department = null): Response
    {
        $filters = new ProductFilters($request, $department);

        $products = $filters->query()
            ->paginate(24)
            ->withQueryString()
            ->through(fn (Product $product) => $product->toCard());

        return Inertia::render('Shop/Index', [
            'department' => $department?->only('name', 'slug', 'blurb'),
            'departments' => Department::withCount('products')->orderBy('sort_order')->get()
                ->map(fn ($d) => ['name' => $d->name, 'slug' => $d->slug, 'count' => $d->products_count]),
            'products' => $products,
            'filters' => $filters->values,
            'facets' => $filters->facets(),
        ]);
    }
}
