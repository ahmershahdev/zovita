import { Link, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';
import { gsap } from '@/lib/gsap';
import MobileMenu from './MobileMenu';
import SearchOverlay from './SearchOverlay';

const primary = [
    { label: 'Shop', href: () => route('shop.index'), mega: true, match: 'shop.*' },
    { label: 'Prescription', href: () => route('prescriptions.create'), match: 'prescriptions.*' },
    { label: 'Track order', href: () => route('orders.track'), match: 'orders.track' },
    { label: 'About', href: () => route('about'), match: 'about' },
];

export default function Header() {
    const { cart, wishlist, auth, nav, app } = usePage().props;
    const [hidden, setHidden] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [megaOpen, setMegaOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const badge = useRef(null);
    const lastCount = useRef(cart.count);

    // Hide on scroll down, reveal on scroll up.
    useEffect(() => {
        let last = window.scrollY;
        const onScroll = () => {
            const y = window.scrollY;
            setScrolled(y > 24);
            setHidden(y > 240 && y > last && !megaOpen);
            last = y;
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [megaOpen]);

    // ⌘K / Ctrl+K / "/" opens search.
    useEffect(() => {
        const onKey = (e) => {
            const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
            if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Bounce the bag badge when the count increases.
    useEffect(() => {
        if (cart.count > lastCount.current && badge.current) {
            gsap.fromTo(badge.current, { scale: 0.4 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.35)' });
        }
        lastCount.current = cart.count;
    }, [cart.count]);

    const closeSearch = useCallback(() => setSearchOpen(false), []);
    const closeMenu = useCallback(() => setMenuOpen(false), []);

    const iconBtn = 'relative grid size-11 place-items-center rounded-full transition hover:bg-ink hover:text-paper';

    return (
        <>
            <div className="bg-ink text-paper">
                <p className="container-x eyebrow flex h-9 items-center justify-center gap-3 text-center text-[0.64rem]! text-paper/80">
                    <span className="size-1.5 rounded-full bg-mint" />
                    Free delivery over PKR {app.freeDeliveryOver.toLocaleString()}<span className="hidden sm:inline"> · Pharmacist-verified · Cash on delivery</span>
                </p>
            </div>

            <header
                className={cn(
                    'sticky top-0 z-50 transition-transform duration-500 ease-[var(--ease-expo)]',
                    hidden && '-translate-y-full',
                )}
                onMouseLeave={() => setMegaOpen(false)}
            >
                <div
                    className={cn(
                        'border-b transition-colors duration-300',
                        scrolled || megaOpen ? 'border-line bg-paper/85 backdrop-blur-xl' : 'border-transparent bg-paper',
                    )}
                >
                    <div className="container-x flex h-18 items-center gap-6">
                        <Link href={route('home')} className="flex items-center gap-2" aria-label="Zovita home">
                            <img src={`${app.url}/images/brand/logo.png`} alt="" className="size-9 rounded-full" width="36" height="36" />
                            <span className="font-display text-[1.9rem] leading-none tracking-tight">
                                Zovita<span className="text-teal">+</span>
                            </span>
                        </Link>

                        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Primary">
                            {primary.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href()}
                                    onMouseEnter={() => setMegaOpen(!!item.mega)}
                                    onFocus={() => setMegaOpen(!!item.mega)}
                                    className={cn(
                                        'relative rounded-full px-4 py-2 text-[0.93rem] transition hover:bg-paper-deep',
                                        route().current(item.match) && 'bg-paper-deep',
                                    )}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="ml-auto hidden h-11 w-full max-w-xs items-center gap-3 rounded-full border border-line-strong px-4 text-left text-sm text-ink-mute transition hover:border-ink md:flex"
                        >
                            <Icon name="search" size={18} />
                            <span className="flex-1">Search medicines, brands…</span>
                            <kbd className="rounded-md border border-line-strong px-1.5 font-mono text-[0.7rem]">⌘K</kbd>
                        </button>

                        <div className="ml-auto flex items-center gap-1 md:ml-0">
                            <button type="button" onClick={() => setSearchOpen(true)} className={cn(iconBtn, 'md:hidden')} aria-label="Search">
                                <Icon name="search" />
                            </button>
                            <Link href={route('wishlist.index')} className={cn(iconBtn, 'hidden sm:grid')} aria-label={`Wishlist, ${wishlist.length} items`}>
                                <Icon name="heart" />
                                {wishlist.length > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-coral" />}
                            </Link>
                            <Link href={auth.user ? route('account.dashboard') : route('login')} className={cn(iconBtn, 'hidden sm:grid')} aria-label={auth.user ? 'Your account' : 'Sign in'}>
                                <Icon name="user" />
                            </Link>
                            <Link href={route('cart.index')} className="relative ml-1 flex h-11 items-center gap-2 rounded-full bg-ink pl-4 pr-1.5 text-paper transition hover:bg-ink-soft" aria-label={`Bag, ${cart.count} items`}>
                                <Icon name="bag" size={18} />
                                <span className="hidden text-sm sm:inline">Bag</span>
                                <span ref={badge} className="grid h-8 min-w-8 place-items-center rounded-full bg-mint px-2 font-mono text-xs text-ink">
                                    {cart.count}
                                </span>
                            </Link>
                            <button type="button" onClick={() => setMenuOpen(true)} className={cn(iconBtn, 'lg:hidden')} aria-label="Open menu">
                                <Icon name="menu" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mega menu */}
                <div
                    className={cn(
                        'absolute inset-x-0 top-full hidden origin-top border-b border-line bg-paper/95 backdrop-blur-xl transition-[opacity,transform] duration-500 ease-[var(--ease-expo)] lg:block',
                        megaOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-3 opacity-0',
                    )}
                >
                    <div className="container-x grid grid-cols-4 gap-x-10 gap-y-8 py-10">
                        {nav.map((dept, i) => (
                            <div key={dept.slug}>
                                <Link href={route('shop.department', dept.slug)} onClick={() => setMegaOpen(false)} className="group flex items-baseline gap-2">
                                    <span className="font-mono text-xs text-ink-mute">0{i + 1}</span>
                                    <span className="font-display text-2xl transition group-hover:italic">{dept.name}</span>
                                </Link>
                                <ul className="mt-3 space-y-1.5 border-l border-line pl-5">
                                    {dept.categories.map((cat) => (
                                        <li key={cat.slug}>
                                            <Link
                                                href={route('shop.department', { department: dept.slug, category: cat.slug })}
                                                onClick={() => setMegaOpen(false)}
                                                className="text-sm text-ink-mute transition hover:text-ink"
                                            >
                                                {cat.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            <SearchOverlay open={searchOpen} onClose={closeSearch} />
            <MobileMenu open={menuOpen} onClose={closeMenu} links={primary} />
        </>
    );
}
