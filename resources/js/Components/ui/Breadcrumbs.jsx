import { Head, Link } from '@inertiajs/react';
import { cn } from '@/lib/cn';

const absolute = (href) => (href ? new URL(href, window.location.origin).href : undefined);

/**
 * Breadcrumb trail in a glass capsule: home icon, chevrons, the current page truncated. Scrolls
 * sideways on small screens instead of wrapping. Emits schema.org BreadcrumbList JSON-LD unless
 * `schema={false}` (product and shop pages get theirs server-side).
 * `items`: [{ label, href? }] — "Home" is added automatically; the last item is the current page.
 */
export default function Breadcrumbs({ items, schema = true, className }) {
    const trail = [{ label: 'Home', href: route('home') }, ...items.filter((i) => i && i.label && i.label !== 'Home')];

    return (
        <nav aria-label="Breadcrumb" className={cn('scrollbar-none -mx-1 overflow-x-auto px-1', className)}>
            {schema && typeof window !== 'undefined' && (
                <Head>
                    <script head-key="jsonld-crumbs" type="application/ld+json">
                        {JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'BreadcrumbList',
                            itemListElement: trail.map((item, i) => ({
                                '@type': 'ListItem',
                                position: i + 1,
                                name: item.label,
                                item: absolute(item.href ?? (i === trail.length - 1 ? window.location.href : undefined)),
                            })),
                        }).replace(/</g, '\\u003c')}
                    </script>
                </Head>
            )}
            <ol className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-line bg-card/60 p-1 pr-4 text-[0.78rem] backdrop-blur">
                {trail.map((item, i) => {
                    const last = i === trail.length - 1;
                    return (
                        <li key={`${item.label}-${i}`} className="flex items-center gap-1">
                            {i > 0 && (
                                <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-ink-mute/60" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                                    <path d="m6 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                            {i === 0 ? (
                                <Link href={item.href} className="grid size-7 place-items-center rounded-full text-ink-mute transition-colors hover:bg-ink hover:text-paper" aria-label="Home">
                                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8Z" />
                                    </svg>
                                </Link>
                            ) : item.href && !last ? (
                                <Link href={item.href} className="rounded-full px-2 py-1 text-ink-mute transition-colors hover:bg-ink/5 hover:text-ink">
                                    {item.label}
                                </Link>
                            ) : (
                                <span aria-current="page" className="max-w-[16rem] truncate px-2 py-1 font-medium text-ink sm:max-w-md">
                                    {item.label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
