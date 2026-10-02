<?php

namespace App\Support;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Per-page SEO payload, shared with Inertia as the `seo` prop. It is rendered server-side in
 * app.blade.php (so crawlers get complete meta without running JS) and kept in sync on client-side
 * navigation by the <Seo> component.
 *
 *  - Every public route has a title, description and structured data here (PAGES / pageSchema), so
 *    no page ships generic metadata. Controllers refine it with Seo::set() (products, shop).
 *  - Absolute URLs (canonical, Open Graph, sitemap, robots, llms.txt) always use the public site
 *    URL (config zovita.site_url → https://zovita.ahmershah.dev), whatever host served the request.
 */
final class Seo
{
    private const PRIVATE_ROUTES = ['cart.*', 'checkout.*', 'account.*', 'orders.track*', 'wishlist.*', 'password.*', 'admin.*'];

    /** route name => [title, description] */
    private const PAGES = [
        'home' => [null, 'Authentic medicines, vitamins, skin care and health devices from 200+ trusted brands — pharmacist-verified orders, personal offers and cash on delivery.'],
        'body-map' => ['Body map — find relief by symptom', 'Tap where it hurts on an interactive 3D body map to see self-care tips, warning signs and pharmacist-picked products for your symptom.'],
        'about' => ['About Zovita', 'Why Zovita exists: a calm, honest online pharmacy with authentic stock, pharmacist review and delivery you can rely on.'],
        'faq' => ['FAQ — help centre', 'Answers about ordering, delivery, payment, prescriptions, returns, your account and privacy at Zovita.'],
        'contact' => ['Contact us', 'Reach Zovita’s care team and pharmacists for order updates, prescription help and product questions — by phone, email or message.'],
        'prescriptions.create' => ['Upload a prescription', 'Upload a photo or PDF of your prescription. A licensed pharmacist reviews it — and if no decision is made within 24 hours it is approved automatically.'],
        'orders.track' => ['Track your order', 'Track your Zovita order with its order number and email, from pharmacist review to delivery.'],
        'cart.index' => ['Your bag', 'Review the items in your bag, personal offers and delivery before checkout.'],
        'wishlist.index' => ['Wishlist', 'Products you saved for later.'],
        'checkout.create' => ['Checkout', 'Secure checkout with cash on delivery.'],
        'login' => ['Sign in', 'Sign in to your Zovita account.'],
        'register' => ['Create account', 'Create a Zovita account to save addresses, track orders and keep prescriptions in one place.'],
        'password.request' => ['Reset password', 'Get a secure link to reset your Zovita password.'],
        'account.dashboard' => ['Your account', 'Orders, prescriptions and profile.'],
    ];

    private const LEGAL = [
        'shipping' => ['Shipping & delivery', 'Delivery areas and timing, fees (free over the threshold), prescription orders, packaging and what happens at the door.'],
        'returns' => ['Returns & refunds', 'A clear, fair return process: 7-day window, what can be returned, damaged or wrong items fixed at our cost, refunds in 5–7 days.'],
        'privacy' => ['Privacy policy', 'What Zovita collects, why, who sees it, how long it is kept, cookies, security and your rights over your data.'],
        'terms' => ['Terms of service', 'The terms for browsing and ordering at Zovita: accounts, orders, prescriptions, pricing, delivery and liability.'],
    ];

    public static function siteUrl(): string
    {
        return rtrim((string) (config('zovita.site_url') ?: url('/')), '/');
    }

    /** Re-base an app URL (route(), url()) onto the public site URL. */
    public static function absolute(string $url): string
    {
        $base = rtrim(url('/'), '/');

        if (! str_starts_with($url, $base)) {
            return $url;
        }
        $path = substr($url, strlen($base));

        return self::siteUrl().($path === '' || $path[0] === '?' ? '/'.$path : $path);
    }

    public static function defaults(): array
    {
        $route = Route::currentRouteName();
        [$title, $description] = self::PAGES[$route] ?? [null, null];
        if ($route === 'legal' && ($page = request()->route('page')) && isset(self::LEGAL[$page])) {
            [$title, $description] = self::LEGAL[$page];
        }

        return [
            'title' => $title,
            'description' => $description ?? self::PAGES['home'][1],
            'canonical' => self::absolute(url()->current()),
            'image' => self::absolute(asset('images/hero/hero.png')),
            'type' => 'website',
            // Personal/transactional pages never belong in search results.
            'robots' => request()->routeIs(self::PRIVATE_ROUTES) ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1',
            'jsonLd' => self::pageSchema($route, $title, $description),
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
            'canonical' => $canonical ? self::absolute($canonical) : null,
            'image' => $image ? self::absolute($image) : null,
            'type' => $type,
            'jsonLd' => $jsonLd ? self::rebase($jsonLd) : null,
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
                'item' => $url ? self::absolute($url) : null,
            ]))->values()->all(),
        ];
    }

    /** Structured data for the static pages (products and shop pages add their own). */
    private static function pageSchema(?string $route, ?string $title, ?string $description): array
    {
        $url = self::absolute(url()->current());
        $page = fn (string $type, array $extra = []) => [
            '@context' => 'https://schema.org',
            '@type' => $type,
            '@id' => $url.'#webpage',
            'url' => $url,
            'name' => $title ?? config('app.name'),
            'description' => $description,
            'isPartOf' => ['@id' => self::siteUrl().'/#website'],
            'inLanguage' => app()->getLocale(),
        ] + $extra;
        $crumbs = fn (string $label) => self::breadcrumbs(['Home' => route('home'), $label => $url]);

        return match ($route) {
            'faq' => [self::faqSchema(), $crumbs('FAQ')],
            'about' => [$page('AboutPage', ['about' => ['@id' => self::siteUrl().'/#pharmacy']]), $crumbs('About')],
            'contact' => [$page('ContactPage', ['mainEntity' => ['@id' => self::siteUrl().'/#pharmacy']]), $crumbs('Contact')],
            'body-map' => [$page('MedicalWebPage', [
                'audience' => ['@type' => 'PeopleAudience'],
                'about' => ['@type' => 'MedicalCondition', 'name' => 'Common symptoms and self-care'],
                'mainContentOfPage' => ['@type' => 'WebPageElement', 'cssSelector' => '#main'],
            ]), $crumbs('Body map')],
            'legal' => [$page('WebPage', ['dateModified' => Content::legal()['pages'][request()->route('page')]['updated'] ?? null]), $crumbs((string) $title)],
            'prescriptions.create', 'orders.track' => [$page('WebPage'), $crumbs((string) $title)],
            default => [],
        };
    }

    public static function faqSchema(): array
    {
        $fill = Content::filler();

        return [
            '@context' => 'https://schema.org',
            '@type' => 'FAQPage',
            'mainEntity' => collect(Content::faq())->flatMap(fn ($g) => $g['items'])->map(fn ($i) => [
                '@type' => 'Question',
                'name' => $i['q'],
                'acceptedAnswer' => ['@type' => 'Answer', 'text' => $fill($i['a'])],
            ])->values()->all(),
        ];
    }

    /** Rewrite any app URLs inside structured data to the public site URL. */
    private static function rebase(array $data): array
    {
        array_walk_recursive($data, function (&$v) {
            if (is_string($v) && str_starts_with($v, 'http')) {
                $v = self::absolute($v);
            }
        });

        return $data;
    }
}
