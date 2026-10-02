<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Product;
use App\Services\Catalog\ProductFilters;
use App\Support\Seo;
use App\Support\ShopPath;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class ShopController extends Controller
{
    public const PER_PAGE = 24;

    public function index(Request $request, ?string $path = null): Response|RedirectResponse
    {
        $parsed = ShopPath::parse($path);
        $department = $parsed['department'];

        // Legacy ?category=…&page=… links: fold them into the clean path and redirect permanently.
        if ($request->query->count() > 0) {
            $merged = array_merge($parsed['values'], array_intersect_key($request->query->all(), $parsed['values']));
            $filters = new ProductFilters($merged, $department);
            $page = is_numeric($merged['page'] ?? null) ? max(1, (int) $merged['page']) : 1;

            return redirect()->to(ShopPath::url($department?->slug, $filters->values + ['page' => $page]), 301);
        }

        $filters = new ProductFilters($parsed['values'], $department);
        $page = $parsed['values']['page'];

        /** @var LengthAwarePaginator $paginator */
        $paginator = $filters->query()->paginate(self::PER_PAGE, page: $page);

        // Past the last page (e.g. filters changed): go to the last real page.
        if ($page > 1 && $page > $paginator->lastPage()) {
            return redirect()->to(ShopPath::url($department?->slug, $filters->values + ['page' => $paginator->lastPage()]));
        }

        $pageUrl = fn (int $n) => ShopPath::url($department?->slug, $filters->values + ['page' => $n]);
        $facets = $filters->facets();
        $this->seo($department, $filters->values, $facets, $paginator, $pageUrl);

        return Inertia::render('Shop/Index', [
            'department' => $department?->only('name', 'slug', 'blurb'),
            'departments' => Department::withCount('products')->orderBy('sort_order')->get()
                ->map(fn ($d) => ['name' => $d->name, 'slug' => $d->slug, 'count' => $d->products_count]),
            'products' => [
                'data' => $paginator->getCollection()->map(fn (Product $p) => $p->toCard())->all(),
                'total' => $paginator->total(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'links' => $this->links($paginator, $pageUrl),
            ],
            'filters' => $filters->values,
            'facets' => $facets,
            'canonical' => $pageUrl($paginator->currentPage()),
        ]);
    }

    /**
     * Department / category / brand listings are indexable. Sort, price, form, stock and search
     * combinations are noindex,follow so search engines don't crawl thousands of near-duplicates.
     */
    private function seo(?Department $department, array $v, array $facets, LengthAwarePaginator $paginator, callable $pageUrl): void
    {
        $category = collect($facets['categories'])->firstWhere('slug', $v['category']);
        $brand = collect($facets['brands'])->firstWhere('slug', $v['brand']);
        $name = $category['name'] ?? $brand['name'] ?? $department?->name ?? ($v['q'] !== '' ? "Search results for “{$v['q']}”" : 'Shop all products');
        $page = $paginator->currentPage();

        $crumbs = ['Home' => route('home'), 'Shop' => route('shop.index')];
        if ($department) {
            $crumbs[$department->name] = ShopPath::url($department->slug);
        }
        if ($category) {
            $crumbs[$category['name']] = ShopPath::url($department?->slug, ['category' => $category['slug']]);
        }

        Seo::set(
            title: $page > 1 ? "{$name} — page {$page}" : $name,
            description: $department?->blurb
                ? "{$name}: {$paginator->total()} products. {$department->blurb} Authentic stock, cash on delivery nationwide."
                : "Shop {$paginator->total()} authentic medicines, syrups, supplements and healthcare essentials online.",
            canonical: $pageUrl($page),
            index: $v['q'] === '' && $v['sort'] === 'featured' && $v['form'] === '' && ! $v['in_stock'] && $v['min'] === null && $v['max'] === null && $v['rx'] === '',
            jsonLd: [
                Seo::breadcrumbs($crumbs),
                [
                    '@context' => 'https://schema.org',
                    '@type' => 'ItemList',
                    'name' => $name,
                    'numberOfItems' => $paginator->total(),
                    'itemListElement' => $paginator->getCollection()->values()->map(fn (Product $p, int $i) => [
                        '@type' => 'ListItem',
                        'position' => ($page - 1) * self::PER_PAGE + $i + 1,
                        'url' => route('products.show', $p),
                        'name' => $p->name,
                    ])->all(),
                ],
            ],
        );
    }

    public function department(Request $request, string $department): Response|RedirectResponse
    {
        return $this->index($request, $department);
    }

    /** Same shape as Laravel's paginator links, but pointing at clean /page-N URLs. */
    private function links(LengthAwarePaginator $p, callable $url): array
    {
        $current = $p->currentPage();
        $last = $p->lastPage();
        $pages = collect([1, $last, ...range(max(1, $current - 2), min($last, $current + 2))])->unique()->sort()->values();

        $links = [['url' => $current > 1 ? $url($current - 1) : null, 'label' => 'Previous', 'active' => false]];
        $previous = 0;
        foreach ($pages as $n) {
            if ($n - $previous > 1) {
                $links[] = ['url' => null, 'label' => '…', 'active' => false];
            }
            $links[] = ['url' => $url($n), 'label' => (string) $n, 'active' => $n === $current];
            $previous = $n;
        }
        $links[] = ['url' => $current < $last ? $url($current + 1) : null, 'label' => 'Next', 'active' => false];

        return $links;
    }
}
