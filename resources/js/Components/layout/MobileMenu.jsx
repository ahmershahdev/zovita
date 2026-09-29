import { Link, usePage } from '@inertiajs/react';
import Icon from '@/Components/ui/Icon';
import Overlay from './Overlay';

export default function MobileMenu({ open, onClose, links }) {
    const { nav, auth, app } = usePage().props;

    return (
        <Overlay open={open} onClose={onClose} side="right" label="Menu" className="flex flex-col">
            <div className="flex h-18 items-center justify-between border-b border-line px-5">
                <span className="font-display text-3xl">Menu</span>
                <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full border border-line-strong" aria-label="Close menu">
                    <Icon name="close" />
                </button>
            </div>
            <nav className="flex-1 px-5 py-6" aria-label="Mobile">
                <ul className="space-y-1">
                    {links.map((l) => (
                        <li key={l.label}>
                            <Link href={l.href()} className="block py-2 font-display text-4xl">
                                {l.label}
                            </Link>
                        </li>
                    ))}
                </ul>
                <p className="eyebrow mt-8 text-ink-mute">Departments</p>
                <ul className="mt-3 grid grid-cols-2 gap-2">
                    {nav.map((d) => (
                        <li key={d.slug}>
                            <Link href={route('shop.department', d.slug)} className="block rounded-2xl bg-card px-4 py-3 text-sm">
                                {d.name}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="grid grid-cols-2 gap-2 border-t border-line p-5 text-sm">
                <Link href={auth.user ? route('account.dashboard') : route('login')} className="flex items-center gap-2 rounded-full border border-line-strong px-4 py-3">
                    <Icon name="user" size={18} /> {auth.user ? 'Account' : 'Sign in'}
                </Link>
                <Link href={route('wishlist.index')} className="flex items-center gap-2 rounded-full border border-line-strong px-4 py-3">
                    <Icon name="heart" size={18} /> Wishlist
                </Link>
                <a href={`tel:${app.support.phone.replace(/\s/g, '')}`} className="col-span-2 flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-paper">
                    <Icon name="phone" size={18} /> {app.support.phone}
                </a>
            </div>
        </Overlay>
    );
}
