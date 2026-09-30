<?php

namespace App\Support;

use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Per-page SEO payload, shared with Inertia as the `seo` prop. It is rendered server-side in
 * app.blade.php (so crawlers get complete meta without running JS) and kept in sync on client-side
 * navigation by the <Seo> component.
 *
 *   Seo::set(title: $product->name, description: …, image: …, type: 'product', jsonLd: [...]);
 */
final class Seo
{
    private const PRIVATE_ROUTES = ['cart.*', 'checkout.*', 'account.*', 'orders.track*', 'wishlist.*', 'login', 'register', 'password.*'];

    public static function defaults(): array
    {
        return [
            'title' => null,
            'description' => 'Order authentic medicines, syrups, vitamins and supplements online in Pakistan. Pharmacist-verified orders, cash on delivery and fast delivery.',
            'canonical' => url()->current(),
            'image' => asset('images/hero/hero.png'),
            'type' => 'website',
            // Personal/transactional pages never belong in search results.
            'robots' => request()->routeIs(self::PRIVATE_ROUTES) ? 'noindex,follow' : 'index,follow,max-image-preview:large',
            'jsonLd' => [],
        ];
    }

    /** @param  list<array>  $jsonLd */
    public static function set(
        ?string $title = null,
        ?string $description = null,
        ?string $canonical = null,
        ?string $image = null,
        string $type = 'website',
        array $jsonLd = [],
        bool $index = true,
    ): void {
        Inertia::share('seo', array_filter([
            'title' => $title,
            'description' => $description ? Str::limit(trim(preg_replace('/\s+/', ' ', strip_tags($description))), 158, '…') : null,
            'canonical' => $canonical,
            'image' => $image,
            'type' => $type,
            'jsonLd' => $jsonLd,
            'robots' => $index ? null : 'noindex,follow',
        ], fn ($v) => $v !== null && $v !== []) + self::defaults());
    }

    /** schema.org BreadcrumbList from [label => url|null] pairs (the current page last). */
    public static function breadcrumbs(array $items): array
    {
        $position = 0;

        return [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => collect($items)->map(fn ($url, $label) => array_filter([
                '@type' => 'ListItem',
                'position' => ++$position,
                'name' => $label,
                'item' => $url,
            ]))->values()->all(),
        ];
    }
}
