import { Link, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Marquee from '@/Components/motion/Marquee';
import Icon from '@/Components/ui/Icon';
import ThemeToggle from '@/Components/ui/ThemeToggle';
import { cn } from '@/lib/cn';
import { pad } from '@/lib/format';
import { gsap } from '@/lib/gsap';
import { shopUrl } from '@/lib/shopUrl';
import MobileMenu from './MobileMenu';
import SearchOverlay from './SearchOverlay';

export const primary = [
    { label: 'Shop', href: () => route('shop.index'), mega: true, match: 'shop.*' },
    { label: 'Body map', href: () => route('body-map'), match: 'body-map', tag: 'New' },
    { label: 'Prescription', href: () => route('prescriptions.create'), match: 'prescriptions.*' },
    { label: 'Track order', href: () => route('orders.track'), match: 'orders.track' },
    { label: 'About', href: () => route('about'), match: 'about' },
];

/**
 * Floating capsule navigation.
 *  - glass pill detached from the page; it tightens once you scroll and hides while scrolling down
 *  - a highlight slides between links under the pointer
 *  - "Shop" grows the capsule into a mega menu with a live department preview
 */
export default function Header() {
    const { cart, wishlist, auth, nav, app } = usePage().props;
    const [hidden, setHidden] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [megaOpen, setMegaOpen] = useState(false);
    const [activeDept, setActiveDept] = useState(0);
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [indicator, setIndicator] = useState(null);
    const badge = useRef(null);
    const lastCount = useRef(cart.count);
    const closeTimer = useRef(null);

    useEffect(() => {
        let last = window.scrollY;
        const onScroll = () => {
            const y = window.scrollY;
            setScrolled(y > 40);
            setHidden(y > 320 && y > last + 2 && !megaOpen);
            if (y < last - 2) setHidden(false);
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
            if (e.key === 'Escape') setMegaOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Bounce the bag badge when the count increases.
    useEffect(() => {
        if (cart.count > lastCount.current && badge.current) {
            gsap.fromTo(badge.current, { scale: 0.3, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' });
        }
        lastCount.current = cart.count;
    }, [cart.count]);

    const openMega = () => {
        clearTimeout(closeTimer.current);
        setMegaOpen(true);
    };
    const scheduleClose = () => {
        clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setMegaOpen(false), 180);
    };

    const moveIndicator = (e) => {
        const el = e.currentTarget;
        setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };

    const closeSearch = useCallback(() => setSearchOpen(false), []);
    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const dept = nav[activeDept] ?? nav[0];
    const iconBtn = 'relative grid size-10 place-items-center rounded-full transition-colors duration-300 hover:bg-ink hover:text-paper';

    return (
        <>
            <div className="bg-night text-snow">
                <Marquee duration={38} className="h-9 items-center" itemClassName="gap-10 pr-10">
                    {[
                        `Free delivery over PKR ${app.freeDeliveryOver.toLocaleString()}`,
                        'Pharmacist-verified orders',
                        'Cash on delivery',
                        'New · Body map symptom finder',
                        '100% authentic stock',
                    ].map((t) => (
                        <span key={t} className="eyebrow flex items-center gap-10 text-[0.62rem]! text-snow/75">
                            {t}
                            <span className="size-1 rounded-full bg-mint" />
                        </span>
                    ))}
                </Marquee>
            </div>

            <header
                className={cn(
                    'pointer-events-none sticky top-0 z-50 px-3 pt-3 transition-transform duration-700 ease-[var(--ease-expo)] md:px-5',
                    hidden && '-translate-y-[120%]',
                )}
            >
                <div
                    onMouseLeave={scheduleClose}
                    className={cn(
                        'glass pointer-events-auto mx-auto overflow-hidden border transition-[max-width,border-radius,box-shadow,border-color] duration-700 ease-[var(--ease-expo)]',
                        scrolled || megaOpen ? 'max-w-7xl border-line shadow-[0_24px_60px_-30px_rgb(0_0_0/0.35)]' : 'max-w-[1600px] border-transparent',
                        megaOpen ? 'rounded-[2rem]' : 'rounded-full',
                    )}
                >
                    <div className="flex h-16 items-center gap-3 pl-3 pr-2 md:pl-5">
                        <Link href={route('home')} className="group flex items-center gap-2" aria-label="Zovita home" data-cursor-magnetic>
                            <img src={`${app.url}/images/brand/logo.png`} alt="" className="size-9 rounded-full transition-transform duration-700 ease-[var(--ease-expo)] group-hover:rotate-[360deg]" width="36" height="36" />
                            <span className="font-display text-[1.7rem] leading-none">
                                Zovita<span className="text-teal">+</span>
                            </span>
                        </Link>

                        <nav className="relative ml-4 hidden items-center lg:flex" aria-label="Primary" onMouseLeave={() => setIndicator(null)}>
                            <span
                                aria-hidden="true"
                                className="absolute top-1/2 h-10 -translate-y-1/2 rounded-full bg-ink/[0.07] transition-[left,width,opacity] duration-500 ease-[var(--ease-expo)]"
                                style={{ left: indicator?.left ?? 0, width: indicator?.width ?? 0, opacity: indicator ? 1 : 0 }}
                            />
                            {primary.map((item) => {
                                const current = route().current(item.match);
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href()}
                                        onMouseEnter={(e) => {
                                            moveIndicator(e);
                                            item.mega ? openMega() : scheduleClose();
                                        }}
                                        onFocus={(e) => {
                                            moveIndicator(e);
                                            item.mega ? openMega() : setMegaOpen(false);
                                        }}
                                        aria-expanded={item.mega ? megaOpen : undefined}
                                        aria-current={current ? 'page' : undefined}
                                        className="relative flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[0.92rem] xl:px-4"
                                    >
                                        {current && <span className="size-1.5 rounded-full bg-teal" />}
                                        {item.label}
                                        {item.tag && <span className="rounded-full bg-mint px-1.5 py-px font-mono text-[0.55rem] uppercase tracking-wider text-night">{item.tag}</span>}
                                        {item.mega && <Icon name="plus" size={12} className={cn('transition-transform duration-500', megaOpen && 'rotate-45')} />}
                                    </Link>
                                );
                            })}
                        </nav>

                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="ml-auto hidden h-10 w-full max-w-60 items-center gap-2.5 rounded-full border border-line-strong px-4 text-left text-sm text-ink-mute transition-colors hover:border-ink hover:text-ink md:flex lg:hidden xl:flex"
                        >
                            <Icon name="search" size={16} />
                            <span className="flex-1 truncate">Search 1,000+ products</span>
                            <kbd className="rounded-md border border-line-strong px-1.5 font-mono text-[0.65rem]">⌘K</kbd>
                        </button>

                        <div className="ml-auto flex items-center gap-1 md:ml-1">
                            <ThemeToggle className="hidden sm:flex" />
                            <button type="button" onClick={() => setSearchOpen(true)} className={cn(iconBtn, 'md:hidden lg:grid xl:hidden')} aria-label="Search">
                                <Icon name="search" size={19} />
                            </button>
                            <Link href={route('wishlist.index')} className={cn(iconBtn, 'hidden sm:grid')} aria-label={`Wishlist, ${wishlist.length} items`}>
                                <Icon name="heart" size={19} />
                                {wishlist.length > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-coral ring-2 ring-paper" />}
                            </Link>
                            <Link href={auth.user ? route('account.dashboard') : route('login')} className={cn(iconBtn, 'hidden sm:grid')} aria-label={auth.user ? 'Your account' : 'Sign in'}>
                                <Icon name="user" size={19} />
                            </Link>
                            <Link
                                href={route('cart.index')}
                                data-cursor-magnetic
                                className="group relative ml-1 flex h-11 items-center gap-2 overflow-hidden rounded-full bg-ink pl-4 pr-1.5 text-paper"
                                aria-label={`Bag, ${cart.count} items`}
                            >
                                <Icon name="bag" size={17} className="transition-transform duration-500 group-hover:-rotate-12" />
                                <span className="hidden text-sm sm:inline">Bag</span>
                                <span ref={badge} className="grid h-8 min-w-8 place-items-center rounded-full bg-mint px-2 font-mono text-xs text-night">
                                    {cart.count}
                                </span>
                            </Link>
                            <button
                                type="button"
                                onClick={() => setMenuOpen(true)}
                                className="group grid size-11 place-items-center rounded-full lg:hidden"
                                aria-label="Open menu"
                                aria-expanded={menuOpen}
                            >
                                <span className="flex w-5 flex-col items-end gap-1.5">
                                    <span className="h-px w-5 bg-current transition-all duration-500 group-hover:w-3" />
                                    <span className="h-px w-3 bg-current transition-all duration-500 group-hover:w-5" />
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Mega menu: grows out of the capsule (grid-rows 0fr → 1fr) */}
                    <div
                        className={cn('hidden transition-[grid-template-rows] duration-700 ease-[var(--ease-expo)] lg:grid', megaOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
                        onMouseEnter={openMega}
                        inert={!megaOpen}
                    >
                        <div className="min-h-0">
                            <div className="grid grid-cols-12 gap-8 border-t border-line p-6">
                                <ul className="col-span-5 space-y-0.5">
                                    {nav.map((d, i) => (
                                        <li key={d.slug}>
                                            <Link
                                                href={route('shop.department', d.slug)}
                                                onMouseEnter={() => setActiveDept(i)}
                                                onFocus={() => setActiveDept(i)}
                                                onClick={() => setMegaOpen(false)}
                                                className={cn(
                                                    'group flex items-baseline gap-4 rounded-2xl px-4 py-2 transition-colors duration-300',
                                                    i === activeDept ? 'bg-ink text-paper' : 'hover:bg-ink/5',
                                                )}
                                            >
                                                <span className="font-mono text-[0.65rem] opacity-50">{pad(i + 1)}</span>
                                                <span className="flex-1 font-display text-2xl">{d.name}</span>
                                                <span className="font-mono text-xs opacity-50">{d.count}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>

                                {dept && (
                                    <div key={dept.slug} className="col-span-7 grid grid-cols-2 gap-6 [animation:fade-up_0.6s_var(--ease-expo)]">
                                        <div className="relative overflow-hidden rounded-3xl bg-plate">
                                            {dept.image && <img src={dept.image} alt="" className="absolute inset-0 m-auto size-3/4 object-contain mix-blend-multiply" loading="lazy" />}
                                            <span className="eyebrow absolute bottom-4 left-4 rounded-full bg-night px-3 py-1.5 text-snow">{dept.count} products</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="eyebrow text-ink-mute">Aisle {pad(activeDept + 1)}</p>
                                            <p className="mt-2 font-display text-4xl leading-none">{dept.name}</p>
                                            <p className="mt-3 text-sm text-ink-mute">{dept.blurb}</p>
                                            <ul className="mt-5 flex flex-wrap gap-1.5">
                                                {dept.categories.map((c) => (
                                                    <li key={c.slug}>
                                                        <Link
                                                            href={shopUrl({ department: dept.slug, category: c.slug })}
                                                            onClick={() => setMegaOpen(false)}
                                                            className="block rounded-full border border-line-strong px-3 py-1.5 text-xs transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                                                        >
                                                            {c.name}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                            <Link href={route('shop.department', dept.slug)} onClick={() => setMegaOpen(false)} className="group mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium">
                                                Shop all {dept.name}
                                                <Icon name="arrow" size={16} className="transition-transform duration-500 group-hover:translate-x-1" />
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <SearchOverlay open={searchOpen} onClose={closeSearch} />
            <MobileMenu open={menuOpen} onClose={closeMenu} links={primary} />
        </>
    );
}
