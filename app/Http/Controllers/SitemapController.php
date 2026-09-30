<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Pages\PageController;
use App\Models\Category;
use App\Models\Department;
use App\Models\Product;
use App\Support\CatalogCache;
use App\Support\ShopPath;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    /** XML sitemap: pages, departments, categories and every product (with its image). */
    public function sitemap(): Response
    {
        $xml = CatalogCache::remember('sitemap', now()->addHours(6), function () {
            $urls = [];
            $add = function (string $loc, ?string $lastmod = null, string $freq = 'weekly', float $priority = 0.5, ?string $image = null) use (&$urls) {
                $urls[] = compact('loc', 'lastmod', 'freq', 'priority', 'image');
            };

            $add(route('home'), null, 'daily', 1.0);
            $add(route('shop.index'), null, 'daily', 0.9);
            $add(route('body-map'), null, 'monthly', 0.7);
            foreach (['about', 'faq', 'contact', 'prescriptions.create'] as $name) {
                $add(route($name), null, 'monthly', 0.4);
            }
            foreach (PageController::LEGAL as $page) {
                $add(route('legal', $page), null, 'yearly', 0.2);
            }

            foreach (Department::orderBy('sort_order')->get() as $department) {
                $add(ShopPath::url($department->slug), null, 'daily', 0.8);
            }
            foreach (Category::with('department:id,slug')->has('products')->get() as $category) {
                $add(ShopPath::url($category->department?->slug, ['category' => $category->slug]), null, 'weekly', 0.6);
            }
            Product::select('id', 'slug', 'image_path', 'image_url', 'updated_at')->orderBy('id')->each(function (Product $p) use ($add) {
                $add(route('products.show', $p), $p->updated_at?->toAtomString(), 'weekly', 0.7, $p->image);
            });

            return view('sitemap', ['urls' => $urls])->render();
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8', 'Cache-Control' => 'public, max-age=3600']);
    }

    public function robots(): Response
    {
        $lines = [
            'User-agent: *',
            'Allow: /',
            'Disallow: /account',
            'Disallow: /bag',
            'Disallow: /checkout',
            'Disallow: /track-order',
            'Disallow: /wishlist',
            'Disallow: /login',
            'Disallow: /register',
            'Disallow: /forgot-password',
            'Disallow: /reset-password',
            'Disallow: /search/',
            '',
            'Sitemap: '.url('/sitemap.xml'),
        ];

        return response(implode("\n", $lines)."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8', 'Cache-Control' => 'public, max-age=86400']);
    }
}
