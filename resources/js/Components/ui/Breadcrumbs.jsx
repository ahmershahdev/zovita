import { Link } from '@inertiajs/react';

export default function Breadcrumbs({ items }) {
    return (
        <nav aria-label="Breadcrumb">
            <ol className="eyebrow flex flex-wrap items-center gap-2 text-ink-mute">
                {items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                        {i > 0 && <span aria-hidden="true">/</span>}
                        {item.href ? (
                            <Link href={item.href} className="transition hover:text-ink">
                                {item.label}
                            </Link>
                        ) : (
                            <span aria-current="page" className="text-ink">
                                {item.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
