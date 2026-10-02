import { Link, usePage } from '@inertiajs/react';
import Icon from '@/Components/ui/Icon';

/**
 * Slim footer for focused flows (sign in, sign up, password reset). The form stays the only task on
 * the page, while the policies a customer agrees to and a way to reach a human remain one tap away.
 */
export default function CompactFooter() {
    const { app } = usePage().props;
    const links = [
        ['Privacy', route('legal', 'privacy')],
        ['Terms', route('legal', 'terms')],
        ['Shipping', route('legal', 'shipping')],
        ['Returns', route('legal', 'returns')],
        ['FAQ', route('faq')],
    ];

    return (
        <footer className="container-x pb-24 pt-2">
            <div className="flex flex-col items-center justify-between gap-4 rounded-4xl border border-line px-6 py-4 text-sm text-ink-mute md:flex-row md:rounded-full">
                <p className="flex items-center gap-2">
                    <Icon name="lock" size={14} className="text-teal" />
                    © {new Date().getFullYear()} {app.name} · Encrypted &amp; private
                </p>
                <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-5 gap-y-1">
                    {links.map(([label, href]) => (
                        <Link key={label} href={href} className="transition-colors hover:text-ink">
                            {label}
                        </Link>
                    ))}
                </nav>
                {app.support?.phone && (
                    <a href={`tel:${app.support.phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 transition-colors hover:text-ink">
                        <Icon name="phone" size={14} /> {app.support.phone}
                    </a>
                )}
            </div>
        </footer>
    );
}
