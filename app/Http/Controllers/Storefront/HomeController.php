<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Department;
use App\Models\Product;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    /** Shop-by-condition tiles: image in public/images/conditions → search term. */
    private const CONDITIONS = [
        ['label' => 'Fever relief', 'image' => 'fever-relief', 'query' => ['category' => 'pain-fever-relief']],
        ['label' => 'Cough & cold', 'image' => 'cough-and-cold', 'query' => ['category' => 'cough-cold']],
        ['label' => 'Acne care', 'image' => 'acne', 'query' => ['category' => 'acne']],
        ['label' => 'Hair fall', 'image' => 'hairfall', 'query' => ['category' => 'hair-growth']],
        ['label' => 'Sun protection', 'image' => 'sun-protection', 'query' => ['category' => 'sunscreen']],
        ['label' => 'Sleep support', 'image' => 'sleep-disorders', 'query' => ['category' => 'insomnia']],
        ['label' => 'Bones & joints', 'image' => 'bones-and-joints-pain', 'query' => ['category' => 'calcium-minerals']],
        ['label' => 'Digestive care', 'image' => 'constipation', 'query' => ['category' => 'acidity-indigestion']],
        ['label' => 'Body aches', 'image' => 'pain-and-body-aches', 'query' => ['q' => 'pain']],
    ];

    public function __invoke(): Response
    {
        $data = Cache::remember('home.v1', now()->addMinutes(10), function () {
            $cards = fn ($query) => $query->with('brand', 'category')->get()->map->toCard()->all();

            return [
                'departments' => Department::withCount('products')->orderBy('sort_order')->get()
                    ->map(fn (Department $d) => [
                        'name' => $d->name,
                        'slug' => $d->slug,
                        'blurb' => $d->blurb,
                        'count' => $d->products_count,
                        'image' => $d->products()->where('is_featured', true)->first()?->image
                            ?? $d->products()->first()?->image,
                    ])->all(),
                'featured' => $cards(Product::where('is_featured', true)->inStock()->limit(12)),
                'deals' => $cards(Product::whereNotNull('sale_price')->inStock()
                    ->orderByRaw('(price - sale_price) / price DESC')->limit(10)),
                'supplements' => $cards(Product::whereHas('department', fn ($q) => $q->where('slug', 'vitamins-supplements'))
                    ->inStock()->orderByDesc('stock')->limit(10)),
                'brands' => Brand::whereNotNull('logo_path')->withCount('products')->orderByDesc('products_count')->get()
                    ->map(fn (Brand $b) => ['name' => $b->name, 'slug' => $b->slug, 'logo' => asset($b->logo_path)])->all(),
                'stats' => [
                    'products' => Product::count(),
                    'brands' => Brand::count(),
                    'categories' => Category::count(),
                ],
            ];
        });

        return Inertia::render('Home', $data + [
            'conditions' => collect(self::CONDITIONS)->map(fn ($c) => [
                'label' => $c['label'],
                'image' => asset("images/conditions/{$c['image']}.png"),
                'href' => route('shop.index', $c['query']),
            ])->all(),
        ]);
    }
}
