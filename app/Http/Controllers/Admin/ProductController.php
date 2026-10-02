<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\CatalogCache;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('q'));
        $stock = in_array($request->query('stock'), ['low', 'out', 'hidden'], true) ? $request->query('stock') : null;

        $products = Product::with('brand', 'category')
            ->when($search !== '', fn ($q) => $q->search($search))
            ->when($stock === 'low', fn ($q) => $q->whereBetween('stock', [1, 5]))
            ->when($stock === 'out', fn ($q) => $q->where('stock', 0))
            ->when($stock === 'hidden', fn ($q) => $q->whereNull('image_path'))
            ->orderBy($stock ? 'stock' : 'name')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Product $p) => $p->toCard() + ['stock' => $p->stock, 'listed' => (bool) $p->image_path, 'sale_price' => $p->sale_price]);

        return Inertia::render('Admin/Products', ['products' => $products, 'filters' => ['q' => $search, 'stock' => $stock]]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $data = $request->validate([
            'stock' => ['required', 'integer', 'min:0', 'max:100000'],
            'price' => ['required', 'numeric', 'min:1', 'max:1000000'],
            'sale_price' => ['nullable', 'numeric', 'min:1', 'lt:price'],
        ]);
        $product->update($data);
        CatalogCache::flush();

        return back()->with('success', "{$product->name} updated.");
    }
}
