{!! '<'.'?xml version="1.0" encoding="UTF-8"?>' !!}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">
@foreach ($urls as $url)
    <url>
        <loc>{{ $url['loc'] }}</loc>
        <xhtml:link rel="alternate" hreflang="en" href="{{ $url['loc'] }}"/>
        <xhtml:link rel="alternate" hreflang="ur" href="{{ $url['ur'] }}"/>
        <xhtml:link rel="alternate" hreflang="x-default" href="{{ $url['loc'] }}"/>
@if ($url['lastmod'])
        <lastmod>{{ $url['lastmod'] }}</lastmod>
@endif
        <changefreq>{{ $url['freq'] }}</changefreq>
        <priority>{{ number_format($url['priority'], 1) }}</priority>
@if ($url['image'])
        <image:image><image:loc>{{ $url['image'] }}</image:loc>@if ($url['title'])<image:title>{{ $url['title'] }}</image:title>@endif</image:image>
@endif
    </url>
@endforeach
</urlset>
