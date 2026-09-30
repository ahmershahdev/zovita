import { Head, usePage } from '@inertiajs/react';

/**
 * Client-side mirror of the server-rendered SEO tags in app.blade.php (same head-keys), so meta,
 * canonical and JSON-LD stay correct during Inertia navigation. Data comes from the shared `seo`
 * prop set by App\Support\Seo. Pages can still override single tags with their own <Head>.
 */
export default function Seo() {
    const { seo, app } = usePage().props;
    if (!seo) return null;
    const title = seo.title ? `${seo.title} — ${app.name}` : `${app.name} — Online pharmacy in Pakistan`;

    return (
        <Head>
            <meta head-key="description" name="description" content={seo.description} />
            <meta head-key="robots" name="robots" content={seo.robots} />
            <link head-key="canonical" rel="canonical" href={seo.canonical} />
            <meta head-key="og:type" property="og:type" content={seo.type} />
            <meta head-key="og:title" property="og:title" content={title} />
            <meta head-key="og:description" property="og:description" content={seo.description} />
            <meta head-key="og:url" property="og:url" content={seo.canonical} />
            <meta head-key="og:image" property="og:image" content={seo.image} />
            <meta head-key="twitter:title" name="twitter:title" content={title} />
            <meta head-key="twitter:description" name="twitter:description" content={seo.description} />
            <meta head-key="twitter:image" name="twitter:image" content={seo.image} />
            {(seo.jsonLd ?? []).map((schema, i) => (
                <script key={i} head-key={`jsonld-${i}`} type="application/ld+json">
                    {JSON.stringify(schema).replace(/</g, '\\u003c')}
                </script>
            ))}
        </Head>
    );
}
