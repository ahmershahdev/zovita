<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\CatalogCache;
use App\Support\Seo;
use App\Support\ShopPath;
use Illuminate\Support\Facades\DB;
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

        // Substitutes: always offered for sold-out items; otherwise only "same salt, other brand" matches.
        $alternatives = $product->alternatives(8)
            ->filter(fn (Product $p) => $product->stock === 0 || $product->sharesGenericWith($p))
            ->map(fn (Product $p) => $p->toCard() + ['same_generic' => $product->sharesGenericWith($p)])
            ->values();

        $url = route('products.show', $product);
        $shopUrl = ShopPath::url($product->department->slug);
        Seo::set(
            title: $product->name,
            description: $product->summary ?: $product->indication ?: "Buy {$product->name} online in Pakistan at Zovita.",
            canonical: $url,
            image: $product->image,
            type: 'product',
            jsonLd: [
                array_filter([
                    '@context' => 'https://schema.org',
                    '@type' => 'Product',
                    '@id' => $url.'#product',
                    'name' => $product->name,
                    'url' => $url,
                    'sku' => $product->slug,
                    'image' => array_values(array_unique(array_filter([$product->image, $product->thumb]))),
                    'description' => $product->summary ?: $product->indication,
                    'category' => $product->category?->name,
                    'brand' => $product->brand ? ['@type' => 'Brand', 'name' => $product->brand->name] : null,
                    'additionalProperty' => array_values(array_filter([
                        $product->generics ? ['@type' => 'PropertyValue', 'name' => 'Active ingredient', 'value' => $product->generics] : null,
                        ['@type' => 'PropertyValue', 'name' => 'Prescription', 'value' => $product->requires_prescription ? 'Required' : 'Not required'],
                    ])),
                    'offers' => [
                        '@type' => 'Offer',
                        'url' => $url,
                        'priceCurrency' => 'PKR',
                        'price' => $product->current_price,
                        'priceValidUntil' => now()->addMonth()->toDateString(),
                        'itemCondition' => 'https://schema.org/NewCondition',
                        'availability' => $product->stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                        'seller' => ['@id' => url('/').'#pharmacy'],
                    ],
                ]),
                Seo::breadcrumbs([
                    'Home' => route('home'),
                    'Shop' => route('shop.index'),
                    $product->department->name => $shopUrl,
                    (string) $product->category?->name => ShopPath::url($product->department->slug, ['category' => $product->category?->slug]),
                    $product->name => $url,
                ]),
            ],
        );

        return Inertia::render('Product/Show', [
            'product' => $product->toCard() + [
                'summary' => $product->summary,
                'description' => $product->description,
                'indication' => $product->indication,
                'dosage' => $product->dosage,
                'precautions' => $product->precautions,
                'how_it_works' => $product->how_it_works,
                'highlights' => $product->highlights,
                'warnings' => $product->warnings,
                'pack' => $product->pack,
                'stock' => $product->stock,
                'brand_slug' => $product->brand?->slug,
                'category_slug' => $product->category?->slug,
                'department' => $product->department->only('name', 'slug'),
            ],
            'priceStats' => CatalogCache::remember("price-stats.{$product->category_id}.{$product->id}", now()->addHour(), fn () => $this->priceStats($product)),
            'alternatives' => $alternatives,
            'related' => $related,
        ]);
    }

    /** Where this product's price sits among its category — real catalog numbers for the chart. */
    private function priceStats(Product $product): ?array
    {
        $prices = Product::where('category_id', $product->category_id)
            ->pluck(DB::raw('COALESCE(sale_price, price) as p'))
            ->map(fn ($p) => (float) $p)
            ->sort()
            ->values();

        if ($prices->count() < 3) {
            return null;
        }

        return [
            'category' => $product->category?->name,
            'count' => $prices->count(),
            'min' => $prices->first(),
            'max' => $prices->last(),
            'median' => $prices->median(),
            'prices' => $prices->all(),
            'current' => $product->current_price,
        ];
    }
}
