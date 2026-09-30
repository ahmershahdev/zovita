import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLenis } from '@/Components/motion/SmoothScroll';
import Icon from '@/Components/ui/Icon';
import ThemeToggle from '@/Components/ui/ThemeToggle';
import { cn } from '@/lib/cn';
import { pad } from '@/lib/format';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

/** Full-screen menu: the panel wipes down, then the big links rise in one after another. */
export default function MobileMenu({ open, onClose, links }) {
    const { nav, auth, app } = usePage().props;
    const lenis = useLenis();
    const root = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        lenis?.stop();
        document.documentElement.style.overflow = 'hidden';
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        const off = router.on('start', onClose);
        return () => {
            lenis?.start();
            document.documentElement.style.overflow = '';
            window.removeEventListener('keydown', onKey);
            off();
        };
    }, [open, onClose, lenis]);

    useLayoutEffect(() => {
        if (!open || prefersReducedMotion()) return undefined;
        const ctx = gsap.context(() => {
            gsap.from('[data-menu-link]', { yPercent: 110, duration: 1, stagger: 0.06, delay: 0.25 });
            gsap.from('[data-menu-fade]', { opacity: 0, y: 16, duration: 0.8, stagger: 0.04, delay: 0.5 });
        }, root);
        return () => ctx.revert();
    }, [open]);

    return createPortal(
        <div
            ref={root}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            inert={!open}
            data-lenis-prevent
            className={cn(
                'fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-night text-snow transition-[clip-path] duration-[900ms] ease-[var(--ease-quart)]',
                open ? '[clip-path:inset(0_0_0_0)]' : 'pointer-events-none [clip-path:inset(0_0_100%_0)]',
            )}
        >
            <>
                    <div className="flex h-20 shrink-0 items-center justify-between px-5">
                        <span className="font-display text-3xl">
                            Zovita<span className="text-mint">+</span>
                        </span>
                        <div className="flex items-center gap-3">
                            <ThemeToggle className="border-white/25" />
                            <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full border border-white/25" aria-label="Close menu">
                                <Icon name="close" />
                            </button>
                        </div>
                    </div>

                    <nav className="flex-1 px-5 pb-8" aria-label="Mobile">
                        <ul>
                            {links.map((l, i) => (
                                <li key={l.label} className="line-mask border-b border-white/10">
                                    <Link href={l.href()} data-menu-link className="flex items-baseline gap-4 py-3">
                                        <span className="font-mono text-xs text-mint">{pad(i + 1)}</span>
                                        <span className="font-display text-[clamp(2.6rem,11vw,4.5rem)] leading-none">{l.label}</span>
                                        {l.tag && <span className="rounded-full bg-mint px-2 py-0.5 font-mono text-[0.6rem] uppercase text-night">{l.tag}</span>}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <p data-menu-fade className="eyebrow mt-10 text-snow/50">Departments</p>
                        <ul className="mt-4 flex flex-wrap gap-2">
                            {nav.map((d) => (
                                <li key={d.slug} data-menu-fade>
                                    <Link href={route('shop.department', d.slug)} className="block rounded-full border border-white/20 px-4 py-2.5 text-sm transition-colors hover:bg-snow hover:text-night">
                                        {d.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div data-menu-fade className="grid grid-cols-2 gap-2 border-t border-white/10 p-5 text-sm">
                        <Link href={auth.user ? route('account.dashboard') : route('login')} className="flex items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-3">
                            <Icon name="user" size={18} /> {auth.user ? 'Account' : 'Sign in'}
                        </Link>
                        <Link href={route('wishlist.index')} className="flex items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-3">
                            <Icon name="heart" size={18} /> Wishlist
                        </Link>
                        <a href={`mailto:${app.support.email}`} className="col-span-2 flex items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-3">
                            <Icon name="mail" size={18} /> {app.support.email}
                        </a>
                        <a href={`tel:${app.support.phone.replace(/\s/g, '')}`} className="col-span-2 flex items-center justify-center gap-2 rounded-full bg-mint px-4 py-3 text-night">
                            <Icon name="phone" size={18} /> {app.support.phone}
                        </a>
                    </div>
            </>
        </div>,
        document.body,
    );
}
