import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import ThemeToggle from '@/Components/ui/ThemeToggle';
import { cn } from '@/lib/cn';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

/** Status-specific copy. Every page keeps the same calm, pharmacy-flavoured voice. */
const COPY = {
    400: ['That request didn’t read right.', 'Something in the link or form was malformed. Try again from the page you came from.', 'Bad request'],
    403: ['This shelf is staff-only.', 'You don’t have access to this page. If you think you should, sign in with the right account.', 'Forbidden'],
    404: ['This page is out of stock.', 'The link may be old, mistyped, or the page has been moved to another shelf. Let’s get you to what you need.', 'Not found'],
    405: ['Not like that.', 'That action isn’t available here. Head back and try again.', 'Method not allowed'],
    413: ['That file is too heavy.', 'Uploads can be up to 5 MB — try a smaller photo or a PDF of your prescription.', 'Payload too large'],
    414: ['That link is far too long.', 'Try starting again from the shop or the search below.', 'URI too long'],
    419: ['Your session dozed off.', 'For your security the page expired. Refresh and try again.', 'Session expired'],
    429: ['Easy there — one dose at a time.', 'Too many requests in a short time. Take a breath and try again in a minute.', 'Too many requests'],
    500: ['We dropped something behind the counter.', 'Our team has been notified and is on it. Please try again in a moment.', 'Server error'],
    503: ['Restocking the shelves.', 'We’re doing a little maintenance and will be back very soon.', 'Maintenance'],
};

const ROUTES = [
    { label: 'Shop the pharmacy', hint: '1,000+ products', icon: 'bag', href: () => route('shop.index') },
    { label: 'Body map', hint: 'Start from a symptom', icon: 'body', href: () => route('body-map') },
    { label: 'Upload prescription', hint: 'Reviewed within 24h', icon: 'rx', href: () => route('prescriptions.create') },
    { label: 'Help centre', hint: 'Answers, fast', icon: 'spark', href: () => route('faq') },
];

const PILLS = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: (i * 53 + 11) % 100,
    y: (i * 37 + 23) % 100,
    rot: (i * 47) % 180,
    size: 0.6 + ((i * 7) % 5) / 6,
    tone: ['a', 'b', 'c', 'd'][i % 4],
}));

export default function ErrorPage({ status = 404 }) {
    const code = COPY[status] ? status : 500;
    const [title, body, label] = COPY[code];
    const digits = String(code).split('');
    const root = useRef(null);
    const field = useRef(null);
    const [query, setQuery] = useState('');
    const [spilled, setSpilled] = useState(false);

    // Entrance: digits rise, copy fades up, pills drift in.
    useLayoutEffect(() => {
        if (prefersReducedMotion()) return undefined;
        const ctx = gsap.context(() => {
            gsap.from('[data-digit]', { yPercent: 110, rotate: 6, duration: 1.3, stagger: 0.09, ease: 'expo.out' });
            gsap.from('[data-rise]', { y: 28, opacity: 0, duration: 1, stagger: 0.07, delay: 0.35, ease: 'expo.out' });
            gsap.from('[data-pill]', { scale: 0, opacity: 0, duration: 1.2, stagger: { each: 0.03, from: 'random' }, delay: 0.2, ease: 'back.out(1.6)' });
            gsap.utils.toArray('[data-pill]').forEach((el, i) => {
                gsap.to(el, { y: `+=${10 + (i % 5) * 4}`, rotate: `+=${i % 2 ? 14 : -14}`, duration: 3 + (i % 4), repeat: -1, yoyo: true, ease: 'sine.inOut' });
            });
        }, root);
        return () => ctx.revert();
    }, []);

    // Pills scatter away from the pointer and drift back.
    useEffect(() => {
        if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return undefined;
        const pills = [...field.current.querySelectorAll('[data-pill-wrap]')];
        const setters = pills.map((el) => ({ x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'expo.out' }), y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'expo.out' }) }));
        const onMove = (e) => {
            pills.forEach((el, i) => {
                const r = el.getBoundingClientRect();
                const dx = r.left + r.width / 2 - e.clientX;
                const dy = r.top + r.height / 2 - e.clientY;
                const d = Math.hypot(dx, dy);
                const push = d < 180 ? (180 - d) / 180 : 0;
                setters[i].x((dx / (d || 1)) * push * 90);
                setters[i].y((dy / (d || 1)) * push * 90);
            });
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        return () => window.removeEventListener('pointermove', onMove);
    }, []);

    const search = (e) => {
        e.preventDefault();
        const q = query.trim();
        router.visit(q ? `${route('shop.index')}/search-${encodeURIComponent(q.toLowerCase().replace(/\s+/g, '-'))}` : route('shop.index'));
    };

    return (
        <div ref={root} className="relative isolate min-h-svh overflow-hidden bg-night text-snow">
            <Head title={`${code} — ${label}`}>
                <meta head-key="robots" name="robots" content="noindex,follow" />
            </Head>

            {/* Drifting pill field */}
            <div ref={field} className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgb(158_240_194/0.16),transparent_60%)]" />
                {PILLS.map((p) => (
                    <span key={p.id} data-pill-wrap className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                        <span data-pill className={cn('err-pill', `err-pill-${p.tone}`)} style={{ '--s': p.size, transform: `rotate(${p.rot}deg)` }} />
                    </span>
                ))}
            </div>

            <header className="container-x flex items-center justify-between py-6">
                <Link href={route('home')} className="font-display text-3xl">
                    Zovita<span className="text-mint">+</span>
                </Link>
                <div className="flex items-center gap-3">
                    <span className="eyebrow hidden text-snow/60 sm:inline">
                        Error {code} · {label}
                    </span>
                    <ThemeToggle className="border-snow/25" />
                </div>
            </header>

            <main id="main" className="container-x pb-24 pt-6 md:pt-10">
                <h1 className="sr-only">
                    {code} — {title}
                </h1>

                {/* Giant code: the middle digit is a capsule that splits open */}
                <div className="flex select-none items-end font-display leading-[0.8] tracking-[-0.06em]" aria-hidden="true">
                    {digits.map((d, i) =>
                        d === '0' ? (
                            // No mask around the capsule: its halves swing outside the line box when it opens.
                            <span key={i} className="block">
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    data-digit
                                    onPointerEnter={() => setSpilled(true)}
                                    onPointerLeave={() => setSpilled(false)}
                                    onClick={() => setSpilled((s) => !s)}
                                    className={cn('err-capsule', spilled && 'is-open')}
                                >
                                    <span className="err-capsule-half err-capsule-top" />
                                    <span className="err-capsule-half err-capsule-bottom" />
                                    {Array.from({ length: 9 }, (_, g) => (
                                        <span key={g} className="err-granule" style={{ '--g': g }} />
                                    ))}
                                </button>
                            </span>
                        ) : (
                            <span key={i} className="line-mask">
                                <span data-digit className="block text-[clamp(8rem,30vw,26rem)]">
                                    {d}
                                </span>
                            </span>
                        ),
                    )}
                </div>

                <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:items-end">
                    <div className="lg:col-span-7">
                        <p data-rise className="eyebrow text-mint">
                            Error {code}
                        </p>
                        <p data-rise className="mt-4 font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.04em]">
                            {title}
                        </p>
                        <p data-rise className="mt-5 max-w-xl text-lg text-snow/70">
                            {body}
                        </p>
                        <form data-rise onSubmit={search} role="search" className="mt-8 flex max-w-lg items-center gap-2 rounded-full border border-snow/20 bg-snow/5 p-1.5 pl-5 backdrop-blur focus-within:border-mint">
                            <Icon name="search" size={18} className="shrink-0 text-snow/60" />
                            <label htmlFor="err-search" className="sr-only">
                                Search the pharmacy
                            </label>
                            <input
                                id="err-search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search medicines, brands, symptoms…"
                                className="min-w-0 flex-1 bg-transparent py-2 text-snow placeholder:text-snow/40 focus:outline-none"
                            />
                            <button className="h-11 shrink-0 rounded-full bg-mint px-5 text-sm font-medium text-night transition-transform hover:-translate-y-0.5">Search</button>
                        </form>
                    </div>

                    <nav aria-label="Popular destinations" className="lg:col-span-5">
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {ROUTES.map((r) => (
                                <li key={r.label} data-rise>
                                    <Link href={r.href()} className="group flex items-center gap-3 rounded-3xl border border-snow/15 p-4 transition-colors duration-500 hover:border-mint hover:bg-snow/5">
                                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mint text-night transition-transform duration-500 group-hover:-rotate-12">
                                            <Icon name={r.icon} size={17} />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium">{r.label}</span>
                                            <span className="block text-xs text-snow/55">{r.hint}</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <p data-rise className="mt-5 flex items-center gap-2 text-sm text-snow/55">
                            <Link href={route('home')} className="inline-flex items-center gap-2 text-snow underline decoration-snow/30 underline-offset-4 hover:decoration-mint">
                                <Icon name="arrowLeft" size={14} /> Back to the homepage
                            </Link>
                        </p>
                    </nav>
                </div>
            </main>

            <div className="absolute inset-x-0 bottom-0 overflow-hidden border-t border-snow/10 py-3" aria-hidden="true">
                <div className="flex w-max animate-marquee gap-10 font-mono text-xs uppercase tracking-[0.2em] text-snow/35 [--marquee-duration:40s]">
                    {Array.from({ length: 16 }, (_, i) => (
                        <span key={i}>
                            {code} · {label} · Care, delivered
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Standalone: no store header/footer (the page must render even if the app failed early).
ErrorPage.layout = (page) => page;
