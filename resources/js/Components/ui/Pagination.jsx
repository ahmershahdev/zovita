import { Link } from '@inertiajs/react';
import { cn } from '@/lib/cn';
import Icon from './Icon';

/** Renders Laravel paginator links (prev / numbered / next). */
export default function Pagination({ meta }) {
    if (!meta || meta.last_page <= 1) return null;

    const links = meta.links.slice(1, -1);
    const prev = meta.links[0];
    const next = meta.links[meta.links.length - 1];
    const arrow = 'grid size-11 place-items-center rounded-full border border-line-strong transition hover:bg-ink hover:text-paper';

    return (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
            {prev.url ? (
                <Link href={prev.url} preserveScroll={false} className={arrow} aria-label="Previous page">
                    <Icon name="arrowLeft" size={18} />
                </Link>
            ) : (
                <span className={cn(arrow, 'pointer-events-none opacity-30')}>
                    <Icon name="arrowLeft" size={18} />
                </span>
            )}
            <div className="flex items-center gap-1">
                {links.map((link, i) =>
                    link.url ? (
                        <Link
                            key={i}
                            href={link.url}
                            aria-current={link.active ? 'page' : undefined}
                            className={cn(
                                'grid h-11 min-w-11 place-items-center rounded-full px-3 font-mono text-sm transition',
                                link.active ? 'bg-ink text-paper' : 'hover:bg-paper-deep',
                            )}
                        >
                            {link.label}
                        </Link>
                    ) : (
                        <span key={i} className="px-2 font-mono text-sm text-ink-mute">
                            …
                        </span>
                    ),
                )}
            </div>
            {next.url ? (
                <Link href={next.url} className={arrow} aria-label="Next page">
                    <Icon name="arrow" size={18} />
                </Link>
            ) : (
                <span className={cn(arrow, 'pointer-events-none opacity-30')}>
                    <Icon name="arrow" size={18} />
                </span>
            )}
        </nav>
    );
}
