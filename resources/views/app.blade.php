<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#0b1b33">
    <meta name="description" content="Zovita is Pakistan's calm, trustworthy online pharmacy: authentic medicines, syrups, supplements and care essentials, delivered fast.">
    <meta property="og:site_name" content="Zovita">
    <meta property="og:type" content="website">
    <meta property="og:image" content="{{ asset('images/hero/hero.png') }}">
    <meta name="twitter:card" content="summary_large_image">

    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('images/brand/logo.png') }}">

    {{-- Fontshare (ITF Free Font License). One request per family: the API only returns the first family of a combined request. --}}
    <link rel="preconnect" href="https://api.fontshare.com">
    <link rel="preconnect" href="https://cdn.fontshare.com" crossorigin>
    <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-grotesk@400,500,600&display=swap">
    <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap">
    <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=zodiak@301,401&display=swap">

    <meta name="author" content="{{ config('zovita.author.name') }}">
    <link rel="author" href="{{ config('zovita.author.website') }}">

    <script type="application/ld+json">{!! json_encode([
        '@context' => 'https://schema.org',
        '@type' => 'Pharmacy',
        'name' => 'Zovita',
        'url' => url('/'),
        'logo' => asset('images/brand/logo.png'),
        'email' => config('zovita.support_email'),
        'telephone' => config('zovita.support_phone'),
        'areaServed' => 'PK',
    ], JSON_UNESCAPED_SLASHES) !!}</script>

    @routes
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
    @inertiaHead
</head>
<body class="antialiased">
    @inertia
</body>
</html>
