@php
    // Server-rendered SEO (see App\Support\Seo). Tags carry `inertia` + head-key so the <Seo>
    // component takes them over on the client without duplicates.
    $seo = $page['props']['seo'] ?? \App\Support\Seo::defaults();
    $siteName = config('app.name', 'Zovita');
    $fullTitle = ($seo['title'] ?? null) ? $seo['title'].' — '.$siteName : $siteName.' — Online pharmacy, care delivered';
    $jsonFlags = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP;
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ \App\Http\Middleware\SetLocale::dir() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#f3f0e8">
    <meta name="color-scheme" content="light dark">

    <title inertia>{{ $fullTitle }}</title>
    <meta inertia="description" head-key="description" name="description" content="{{ $seo['description'] }}">
    <meta inertia="robots" head-key="robots" name="robots" content="{{ $seo['robots'] }}">
    <link inertia="canonical" head-key="canonical" rel="canonical" href="{{ $seo['canonical'] }}">
    {{-- Language alternates: English is the default URL, Urdu the same URL with ?lang=ur. --}}
    <link rel="alternate" hreflang="en" href="{{ $seo['canonical'] }}">
    <link rel="alternate" hreflang="ur" href="{{ $seo['canonical'] }}{{ str_contains($seo['canonical'], '?') ? '&' : '?' }}lang=ur">
    <link rel="alternate" hreflang="x-default" href="{{ $seo['canonical'] }}">

    <meta property="og:site_name" content="{{ $siteName }}">
    <meta property="og:locale" content="{{ app()->getLocale() === 'ur' ? 'ur_PK' : 'en_US' }}">
    <meta inertia="og:type" head-key="og:type" property="og:type" content="{{ $seo['type'] }}">
    <meta inertia="og:title" head-key="og:title" property="og:title" content="{{ $fullTitle }}">
    <meta inertia="og:description" head-key="og:description" property="og:description" content="{{ $seo['description'] }}">
    <meta inertia="og:url" head-key="og:url" property="og:url" content="{{ $seo['canonical'] }}">
    <meta inertia="og:image" head-key="og:image" property="og:image" content="{{ $seo['image'] }}">
    <meta name="twitter:card" content="summary_large_image">
    <meta inertia="twitter:title" head-key="twitter:title" name="twitter:title" content="{{ $fullTitle }}">
    <meta inertia="twitter:description" head-key="twitter:description" name="twitter:description" content="{{ $seo['description'] }}">
    <meta inertia="twitter:image" head-key="twitter:image" name="twitter:image" content="{{ $seo['image'] }}">

    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('images/brand/logo.png') }}">
    <link rel="sitemap" type="application/xml" href="{{ url('/sitemap.xml') }}">
    <link rel="alternate" type="text/plain" title="LLM summary" href="{{ url('/llms.txt') }}">

    {{-- Theme before first paint: saved choice, else the OS preference. No flash of the wrong theme. --}}
    <script nonce="{{ Vite::cspNonce() }}">
        (function () {
            var t;
            try { t = localStorage.getItem("zv-theme"); } catch (e) {}
            if (t !== "light" && t !== "dark") t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            document.documentElement.dataset.theme = t;
            document.querySelector("meta[name=theme-color]").content = t === "dark" ? "#0a0f0e" : "#f3f0e8";
        })();
    </script>

    <meta name="author" content="{{ config('zovita.author.name') }}">
    <link rel="author" href="{{ config('zovita.author.website') }}">

    {{-- Site-wide structured data: the pharmacy (organisation, location, contact) and the site search box. --}}
    @php($site = \App\Support\Seo::siteUrl())
    @php($store = config('zovita.store'))
    <script type="application/ld+json">{!! json_encode([
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => ['Pharmacy', 'OnlineStore'],
                '@id' => $site.'/#pharmacy',
                'name' => $siteName,
                'url' => $site.'/',
                'logo' => ['@type' => 'ImageObject', 'url' => $site.'/images/brand/logo.png', 'width' => 512, 'height' => 512],
                'image' => $site.'/images/hero/hero.png',
                'description' => 'Online pharmacy: authentic medicines, vitamins, skin care and health devices with pharmacist-verified orders and cash on delivery.',
                'email' => config('zovita.support_email'),
                'telephone' => config('zovita.support_phone'),
                'address' => [
                    '@type' => 'PostalAddress',
                    'streetAddress' => $store['street'],
                    'addressLocality' => $store['city'],
                    'postalCode' => $store['postal_code'],
                ],
                'geo' => ['@type' => 'GeoCoordinates', 'latitude' => $store['lat'], 'longitude' => $store['lng']],
                'openingHoursSpecification' => [[
                    '@type' => 'OpeningHoursSpecification',
                    'dayOfWeek' => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                    'opens' => '10:00',
                    'closes' => '20:00',
                ]],
                'contactPoint' => [[
                    '@type' => 'ContactPoint',
                    'contactType' => 'customer support',
                    'telephone' => config('zovita.support_phone'),
                    'email' => config('zovita.support_email'),
                    'availableLanguage' => ['English', 'Urdu'],
                ]],
                'paymentAccepted' => 'Cash',
                'currenciesAccepted' => 'PKR',
                'priceRange' => 'PKR 50 – PKR 25,000',
                'knowsLanguage' => ['en', 'ur'],
                'sameAs' => array_values(array_filter([config('zovita.author.github'), config('zovita.author.linkedin')])),
            ],
            [
                '@type' => 'WebSite',
                '@id' => $site.'/#website',
                'name' => $siteName,
                'url' => $site.'/',
                'inLanguage' => ['en', 'ur'],
                'publisher' => ['@id' => $site.'/#pharmacy'],
                'potentialAction' => [
                    '@type' => 'SearchAction',
                    'target' => ['@type' => 'EntryPoint', 'urlTemplate' => $site.'/shop/search-{search_term_string}'],
                    'query-input' => 'required name=search_term_string',
                ],
            ],
        ],
    ], $jsonFlags) !!}</script>

    {{-- Page structured data (Product, BreadcrumbList, FAQPage…). --}}
    @foreach ($seo['jsonLd'] ?? [] as $i => $schema)
        <script type="application/ld+json" inertia="jsonld-{{ $i }}" head-key="jsonld-{{ $i }}">{!! json_encode($schema, $jsonFlags) !!}</script>
    @endforeach

    @routes(null, Vite::cspNonce())
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
    @inertiaHead
</head>
<body class="antialiased">
    @inertia
</body>
</html>
