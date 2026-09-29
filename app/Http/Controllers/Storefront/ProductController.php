<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function show(Product $product): Response
    {
        $product->load('brand', 'category', 'department');

        $related = Product::with('brand', 'category')
            ->where('id', '!=', $product->id)
            ->where('department_id', $product->department_id)
            ->orderByRaw('category_id = ? DESC', [$product->category_id])
            ->orderByRaw('stock > 0 DESC')
            ->limit(10)
            ->get()
            ->map->toCard();

        return Inertia::render('Product/Show', [
            'product' => $product->toCard() + [
                'summary' => $product->summary,
                'description' => $product->description,
                'generics' => $product->generics,
                'indication' => $product->indication,
                'dosage' => $product->dosage,
                'precautions' => $product->precautions,
                'pack' => $product->pack,
                'stock' => $product->stock,
                'brand_slug' => $product->brand?->slug,
                'category_slug' => $product->category?->slug,
                'department' => $product->department->only('name', 'slug'),
            ],
            'related' => $related,
        ]);
    }
}
