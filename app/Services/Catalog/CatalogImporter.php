<?php

namespace App\Services\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Department;
use App\Models\Product;
use App\Support\CatalogCache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Imports database/data/catalog.json (built by tools/catalog/scrape-dvago.mjs).
 * Idempotent: products are upserted by slug so prices/stock can be refreshed.
 */
class CatalogImporter
{
    public function __construct(private readonly string $path = '') {}

    public function import(): int
    {
        $path = $this->path ?: database_path('data/catalog.json');
        if (! is_file($path)) {
            throw new RuntimeException("Catalog file not found at {$path}. Run `npm run catalog:scrape` first.");
        }

        $catalog = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);

        $count = DB::transaction(function () use ($catalog) {
            $departments = [];
            foreach ($catalog['departments'] as $index => $data) {
                $departments[$data['slug']] = Department::updateOrCreate(
                    ['slug' => $data['slug']],
                    ['name' => $data['name'], 'blurb' => $data['blurb'] ?? null, 'sort_order' => $index],
                );
            }

            $featuredSlugs = $this->pickFeatured($catalog['products']);
            $count = 0;

            foreach ($catalog['products'] as $item) {
                $department = $departments[$item['department']] ?? null;
                if (! $department) {
                    continue;
                }

                $category = Category::firstOrCreate(
                    ['slug' => $item['category_slug']],
                    ['name' => $item['category'], 'department_id' => $department->id],
                );

                $brandName = Brand::cleanName($item['brand']);
                $brandSlug = Str::slug($brandName);
                $brand = Brand::updateOrCreate(['slug' => $brandSlug], [
                    'name' => $brandName,
                    'logo_path' => $this->brandLogo(Str::slug($item['brand'])) ?? $this->brandLogo($brandSlug),
                ]);

                Product::updateOrCreate(['slug' => $item['slug']], [
                    'department_id' => $department->id,
                    'category_id' => $category->id,
                    'brand_id' => $brand->id,
                    'name' => $this->cleanName($item['name']),
                    'form' => $item['form'],
                    'pack' => Str::lower($item['pack'] ?? 'pack'),
                    'price' => $item['price'],
                    'sale_price' => $item['sale_price'],
                    'stock' => $item['stock'],
                    'max_per_order' => $item['max_per_order'],
                    'requires_prescription' => $item['requires_prescription'],
                    'is_featured' => in_array($item['slug'], $featuredSlugs, true),
                    'generics' => $this->clip($item['generics'] ?? null, 255),
                    'summary' => self::neutralCopy($this->cleanSummary($item['summary'] ?? '', $item['brand'])),
                    'description' => self::neutralCopy($item['description'] ?? null),
                    'indication' => self::neutralCopy($item['indication'] ?? null),
                    'dosage' => self::neutralCopy($item['dosage'] ?? null),
                    'precautions' => self::neutralCopy($item['precautions'] ?? null),
                    'how_it_works' => self::neutralCopy($item['how_it_works'] ?? null),
                    'highlights' => self::neutralCopy($item['highlights'] ?? null),
                    'warnings' => self::neutralCopy($item['warnings'] ?? null),
                    'image_url' => $this->isPlaceholder($item['image']) ? null : $item['image'],
                    'source_url' => $item['source_url'] ?? null,
                ]);
                $count++;
            }

            return $count;
        });

        // New prices/stock: drop every cached catalog view (home rails, nav, price stats).
        CatalogCache::flush();

        return $count;
    }

    /** Three in-stock products per department with the best discount are featured. */
    private function pickFeatured(array $products): array
    {
        return collect($products)
            ->filter(fn ($p) => $p['stock'] > 0 && ! $p['requires_prescription'])
            ->groupBy('department')
            ->flatMap(fn ($group) => $group
                ->sortByDesc(fn ($p) => $p['sale_price'] ? ($p['price'] - $p['sale_price']) / $p['price'] : 0)
                ->take(3)
                ->pluck('slug'))
            ->all();
    }

    private function cleanName(string $name): string
    {
        // "Panadol Tablets 500Mg" → "Panadol Tablets 500mg"
        return preg_replace_callback('/(\d)(Mg|Ml|G|Kg|Mcg|Iu|L)\b/', fn ($m) => $m[1].strtolower($m[2]), trim($name));
    }

    /** Listing blurbs look like "Buy X 20 PERCENT CREAM from MAKER"; make them readable. */
    private function cleanSummary(string $summary, string $brand): ?string
    {
        $summary = trim($summary);
        if ($summary === '') {
            return null;
        }

        if (Str::startsWith($summary, 'Buy ')) {
            $summary = Str::of($summary)
                ->after('Buy ')
                ->before(' from ')
                ->replace([' PERCENT', ' W PER W', ' W PER V'], ['%', ' w/w', ' w/v'])
                ->lower()
                ->ucfirst()
                ->append(', by '.$brand.'.')
                ->toString();
        }

        return $summary;
    }

    /** DVAGO serves its own logo SVG when a product has no photo; that is not a product image. */
    private function isPlaceholder(?string $url): bool
    {
        return ! $url || str_ends_with(strtolower(strtok($url, '?')), '.svg') || str_contains($url, 'dvago-logo');
    }

    private function clip(?string $value, int $length): ?string
    {
        return $value === null ? null : Str::limit($value, $length - 3);
    }

    /** Logo filename => brand slug prefix, for brands whose logo name differs from the slug. */
    private const LOGO_ALIASES = ['gsk' => 'glaxosmithkline'];

    private function brandLogo(string $slug): ?string
    {
        foreach (self::LOGO_ALIASES as $logo => $prefix) {
            $file = collect(glob(public_path("images/brands/{$logo}.*")) ?: [])->first();
            if ($file && Str::startsWith($slug, $prefix)) {
                return 'images/brands/'.basename($file);
            }
        }

        foreach (glob(public_path('images/brands/*')) ?: [] as $file) {
            $name = pathinfo($file, PATHINFO_FILENAME);
            if (Str::startsWith($slug, $name) || (strlen(Str::before($slug, '-')) >= 4 && Str::startsWith($name, Str::before($slug, '-')))) {
                return 'images/brands/'.basename($file);
            }
        }

        return null;
    }

    /** Store copy is market-neutral: strip country references from scraped marketing text. */
    public static function neutralCopy(?string $text): ?string
    {
        if ($text === null || $text === '') {
            return $text;
        }

        return trim(preg_replace([
            '/\s*,?\s+(?:in|across|throughout|all over|of|from|for)\s+(?:the\s+whole\s+of\s+)?Pakistan\b/iu',
            "/\\bPakistan(?:'|’)s\\s+/iu",
            '/\bPakistani\s+/iu',
            '/\bPakistan\b/iu',
            '/ {2,}/',
            '/\s+([.,;])/',
        ], ['', '', '', 'the country', ' ', '$1'], $text));
    }
}
