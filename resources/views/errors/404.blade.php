{{--
    Server-rendered 404 (no JavaScript needed). The interactive version is Pages/Errors/Error.jsx;
    this one is used whenever the response isn't an Inertia page (e.g. non-HTML clients that still
    render HTML, early failures, or when JS is disabled). public/404.html is the static twin for the
    web server.
--}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,follow">
    <meta name="theme-color" content="#0b1b33">
    <title>404 — This page is out of stock · {{ config('app.name', 'Zovita') }}</title>
    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    @include('errors.partials.style')
</head>
<body>
    <div class="field" aria-hidden="true">
        @foreach (range(0, 13) as $i)
            <span class="pill p{{ $i % 4 }}" style="left: {{ ($i * 53 + 11) % 100 }}%; top: {{ ($i * 37 + 23) % 100 }}%; --r: {{ ($i * 47) % 180 }}deg; --d: {{ 4 + $i % 4 }}s"></span>
        @endforeach
    </div>
    <header><a class="logo" href="{{ route('home') }}">Zovita<b>+</b></a><span class="eyebrow">Error 404 · Not found</span></header>
    <main>
        <h1><span class="sr">404 — </span><span class="code" aria-hidden="true">4<i class="capsule"><i></i><i></i></i>4</span></h1>
        <p class="eyebrow mint">Error 404</p>
        <p class="title">This page is out of stock.</p>
        <p class="body">The link may be old, mistyped, or the page has moved to another shelf. Let’s get you to what you need.</p>
        <form action="{{ route('shop.index') }}" method="get" role="search">
            <label class="sr" for="q">Search the pharmacy</label>
            <input id="q" name="q" placeholder="Search medicines, brands, symptoms…">
            <button>Search</button>
        </form>
        <nav aria-label="Popular destinations">
            <a href="{{ route('shop.index') }}">Shop the pharmacy</a>
            <a href="{{ route('body-map') }}">Body map</a>
            <a href="{{ route('prescriptions.create') }}">Upload prescription</a>
            <a href="{{ route('faq') }}">Help centre</a>
            <a href="{{ route('home') }}">← Homepage</a>
        </nav>
    </main>
</body>
</html>
