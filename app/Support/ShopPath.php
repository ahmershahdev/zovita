<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Department;
use App\Services\Catalog\ProductFilters;
use Illuminate\Support\Str;

/**
 * Clean, query-string-free shop URLs. Filters live in readable path segments:
 *
 *   /shop
 *   /shop/medicines
 *   /shop/medicines/pain-fever-relief
 *   /shop/medicines/pain-fever-relief/brand-haleon/form-tablet/otc/in-stock/price-100-500/sort-price-asc/page-2
 *   /shop/search-vitamin-d
 *
 * Segment order is normalised when building, so every filter combination has exactly one
 * canonical URL (good for SEO and caching). Unknown segments are ignored.
 */
final class ShopPath
{
    /** @return array{department: ?Department, values: array} */
    public static function parse(?string $path): array
    {
        $segments = array_values(array_filter(explode('/', (string) $path), fn ($s) => $s !== ''));
        $values = ['q' => '', 'category' => '', 'brand' => '', 'form' => '', 'rx' => '', 'in_stock' => false, 'min' => null, 'max' => null, 'sort' => 'featured', 'page' => 1];
        $department = null;

        foreach ($segments as $i => $raw) {
            $segment = Str::lower(mb_substr($raw, 0, 120));

            if ($i === 0 && ($d = Department::where('slug', $segment)->first())) {
                $department = $d;
            } elseif (str_starts_with($segment, 'search-')) {
                $values['q'] = mb_substr(str_replace('-', ' ', rawurldecode(substr($segment, 7))), 0, 80);
            } elseif (str_starts_with($segment, 'brand-')) {
                $values['brand'] = substr($segment, 6);
            } elseif (str_starts_with($segment, 'form-')) {
                $values['form'] = substr($segment, 5, 32);
            } elseif ($segment === 'prescription' || $segment === 'otc') {
                $values['rx'] = $segment === 'prescription' ? 'rx' : 'otc';
            } elseif ($segment === 'in-stock') {
                $values['in_stock'] = true;
            } elseif (preg_match('/^price-(\d{1,7})-(\d{1,7}|any)$/', $segment, $m)) {
                $values['min'] = (int) $m[1] ?: null;
                $values['max'] = $m[2] === 'any' ? null : (int) $m[2];
            } elseif (str_starts_with($segment, 'sort-')) {
                $sort = str_replace('-', '_', substr($segment, 5));
                $values['sort'] = array_key_exists($sort, ProductFilters::SORTS) ? $sort : 'featured';
            } elseif (preg_match('/^page-(\d{1,4})$/', $segment, $m)) {
                $values['page'] = max(1, (int) $m[1]);
            } elseif ($values['category'] === '' && preg_match('/^[a-z0-9-]+$/', $segment) && Category::where('slug', $segment)->exists()) {
                $values['category'] = $segment;
            }
        }

        return ['department' => $department, 'values' => $values];
    }

    /** Canonical path for a set of filter values (always the same order). */
    public static function build(?string $department, array $v): string
    {
        $parts = array_filter([
            $department,
            $v['category'] ?? '',
            ($v['brand'] ?? '') !== '' ? 'brand-'.$v['brand'] : '',
            ($v['form'] ?? '') !== '' ? 'form-'.$v['form'] : '',
            match ($v['rx'] ?? '') {
                'rx' => 'prescription', 'otc' => 'otc', default => ''
            },
            ! empty($v['in_stock']) ? 'in-stock' : '',
            ($v['min'] ?? null) !== null || ($v['max'] ?? null) !== null ? 'price-'.((int) ($v['min'] ?? 0)).'-'.(($v['max'] ?? null) === null ? 'any' : (int) $v['max']) : '',
            ($v['sort'] ?? 'featured') !== 'featured' ? 'sort-'.str_replace('_', '-', $v['sort']) : '',
            ($v['q'] ?? '') !== '' ? 'search-'.Str::slug($v['q']) : '',
            ($v['page'] ?? 1) > 1 ? 'page-'.$v['page'] : '',
        ]);

        return '/shop'.($parts ? '/'.implode('/', $parts) : '');
    }

    public static function url(?string $department, array $values = []): string
    {
        return url(self::build($department, $values));
    }
}
