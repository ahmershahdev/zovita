import { Head, Link, router, usePage } from '@inertiajs/react';
import { lazy, useEffect, useMemo, useRef, useState } from 'react';
import PriceInsight from '@/Components/product/PriceInsight';
import ProductCard from '@/Components/product/ProductCard';
import ProductImage from '@/Components/product/ProductImage';
import ProductRail from '@/Components/product/ProductRail';
import QuantityStepper from '@/Components/product/QuantityStepper';
import WishlistButton from '@/Components/product/WishlistButton';
import LazyScene from '@/Components/three/LazyScene';
import Badge from '@/Components/ui/Badge';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';
import Button from '@/Components/ui/Button';
import Icon from '@/Components/ui/Icon';
import Select from '@/Components/ui/Select';
import Price from '@/Components/ui/Price';
import SectionHeading from '@/Components/ui/SectionHeading';
import useRecentlyViewed from '@/hooks/useRecentlyViewed';
import useReveal from '@/hooks/useReveal';
import { cn } from '@/lib/cn';
import { money, pad } from '@/lib/format';
import { fly } from '@/lib/fly';
import { signal } from '@/lib/signals';
import { shopUrl } from '@/lib/shopUrl';

const PackScene = lazy(() => import('@/Components/three/PackScene'));

/** Storage guidance by dosage form (general pharmacy practice; the pack label always wins). */
const STORAGE = {
    syrup: 'Below 25 °C, cap tightly. Use within the period on the label once opened.',
    drops: 'Below 25 °C. Discard 28 days after opening unless the label says otherwise.',
    injection: 'As labelled — many injectables need refrigeration (2–8 °C). Do not freeze.',
    cream: 'Below 25 °C with the cap closed.',
    gel: 'Below 25 °C with the cap closed.',
    ointment: 'Below 25 °C with the cap closed.',
    powder: 'Cool, dry place. Close the tin or pack tightly after each use.',
    device: 'Dry place, away from direct sunlight. Remove batteries if unused for long periods.',
};

const DELIVERY = [
    ['Karachi', '1 day'],
    ['Lahore', '1–2 days'],
    ['Islamabad', '1–2 days'],
    ['Rawalpindi', '1–2 days'],
    ['Faisalabad', '2–3 days'],
    ['Multan', '2–3 days'],
    ['Peshawar', '2–3 days'],
    ['Other cities', '2–5 days'],
];

export default function ProductShow({ product, related, alternatives, priceStats, personalOffer = null }) {
    const { app } = usePage().props;
    const scope = useRef(null);
    const zoom = useRef(null);
    const [qty, setQty] = useState(1);
    const [adding, setAdding] = useState(false);
    const [view, setView] = useState('photo');
    const [city, setCity] = useState(0);
    const [copied, setCopied] = useState(false);
    const recent = useRecentlyViewed(product);
    const gallery = useRef(null);
    useReveal(scope, [product.slug]);

    // Time actually spent looking at this product (visible tab only), sent when leaving it.
    useEffect(() => {
        let visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
        let total = 0;
        const pause = () => {
            if (visibleSince) total += Date.now() - visibleSince;
            visibleSince = null;
        };
        const onVisibility = () => (document.visibilityState === 'visible' ? (visibleSince = Date.now()) : pause());
        const flush = () => {
            pause();
            const seconds = Math.round(total / 1000);
            total = 0;
            if (seconds >= 3) signal('dwell', { product_id: product.id, seconds: Math.min(seconds, 600) });
        };
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pagehide', flush);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', flush);
            flush();
        };
    }, [product.id]);

    useEffect(() => {
        setQty(1);
        setView('photo');
    }, [product.slug]);

    const add = () => {
        fly('cart', { from: gallery.current?.querySelector('img') ?? gallery.current, image: product.thumb ?? product.image });
        router.post(route('cart.store'), { product_id: product.id, quantity: qty }, {
            preserveScroll: true,
            onStart: () => setAdding(true),
            onFinish: () => setAdding(false),
        });
    };

    const buyNow = () =>
        router.post(route('cart.store'), { product_id: product.id, quantity: qty }, { onSuccess: () => router.visit(route('checkout.create')) });

    const share = async () => {
        const url = route('products.show', product.slug);
        try {
            if (navigator.share) await navigator.share({ title: product.name, url });
            else {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch {
            /* dismissed */
        }
    };

    // Hover zoom: shift the transform origin to follow the pointer.
    const onZoom = (e) => {
        if (!zoom.current) return;
        const r = e.currentTarget.getBoundingClientRect();
        zoom.current.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    };

    const sections = [
        { id: 'overview', title: 'Overview', body: product.description || product.summary },
        { id: 'highlights', title: 'Highlights', body: product.highlights },
        { id: 'uses', title: 'Uses & indications', body: product.indication },
        { id: 'how-it-works', title: 'How it works', body: product.how_it_works },
        { id: 'dosage', title: 'Dosage & directions', body: product.dosage },
        { id: 'precautions', title: 'Precautions', body: product.precautions },
        { id: 'warnings', title: 'Warnings', body: product.warnings },
    ].filter((s) => s.body && s.body.length > 3);

    const facts = [
        ['Active ingredient', product.generics],
        ['Form', product.form && product.form !== 'other' ? product.form[0].toUpperCase() + product.form.slice(1) : null],
        ['Pack', product.pack],
        ['Brand', product.brand],
        ['Category', product.category],
        ['Prescription', product.requires_prescription ? 'Required' : 'Not required'],
        ['Max per order', product.max_quantity > 0 ? String(product.max_quantity) : null],
        ['Storage', STORAGE[product.form] ?? 'Cool, dry place below 30 °C, out of reach of children.'],
    ].filter(([, v]) => v);

    const nav = [
        ...sections.map((s) => [s.id, s.title]),
        priceStats && ['price-insight', 'Price insight'],
        alternatives.length > 0 && ['alternatives', product.in_stock ? 'Same salt' : 'Alternatives'],
    ].filter(Boolean);

    const activeSection = useScrollSpy(nav.map(([id]) => id));
    const lowStock = product.stock > 0 && product.stock <= 10;
    const savings = (product.price - product.current_price) * qty;
    const cheapestSame = useMemo(() => alternatives.filter((a) => a.same_generic).sort((a, b) => a.current_price - b.current_price)[0], [alternatives]);

    return (
        <div ref={scope}>
            <Head title={product.name}>
                <link rel="preload" as="image" href={product.image} fetchPriority="high" />
            </Head>

            <section className="container-x pt-6 md:pt-10">
                <Breadcrumbs
                    schema={false}
                    items={[
                        { label: 'Shop', href: route('shop.index') },
                        { label: product.department.name, href: route('shop.department', product.department.slug) },
                        { label: product.category, href: shopUrl({ department: product.department.slug, category: product.category_slug }) },
                        { label: product.name },
                    ]}
                />

                <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-14">
                    {/* Gallery */}
                    <div className="lg:col-span-7">
                        <div className="lg:sticky lg:top-28">
                            <div ref={gallery} className="group relative aspect-square overflow-hidden rounded-5xl bg-card">
                                {view === 'photo' ? (
                                    <div className="absolute inset-0 cursor-zoom-in" onPointerMove={onZoom} data-cursor="Zoom">
                                        <div ref={zoom} className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-[1.6]">
                                            <ProductImage product={product} priority sizes="(min-width: 1024px) 55vw, 100vw" dim={!product.in_stock} className="absolute inset-0 m-auto size-[72%] object-contain mix-blend-multiply" />
                                        </div>
                                    </div>
                                ) : (
                                    <LazyScene
                                        Scene={PackScene}
                                        interactive
                                        image={product.image}
                                        form={product.form}
                                        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--color-card),var(--color-paper-deep))]"
                                        fallback={<p className="absolute inset-0 grid place-items-center text-sm text-ink-mute">Loading 3D view…</p>}
                                    />
                                )}

                                <div className="pointer-events-none absolute left-5 top-5 flex flex-wrap gap-2">
                                    {product.discount_percent > 0 && <Badge tone="coral">Save {product.discount_percent}%</Badge>}
                                    {product.requires_prescription && <Badge tone="ink">Prescription required</Badge>}
                                    {!product.in_stock && <Badge tone="outline">Sold out</Badge>}
                                </div>
                                <WishlistButton product={product} className="absolute right-5 top-5 size-12" />

                                {/* Photo / 3D switch */}
                                <div className="glass absolute bottom-5 left-1/2 flex -translate-x-1/2 rounded-full border border-line p-1 text-sm" role="tablist" aria-label="Product view">
                                    {[
                                        ['photo', 'Photo', 'eye'],
                                        ['3d', '3D view', 'cube'],
                                    ].map(([key, label, icon]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            role="tab"
                                            aria-selected={view === key}
                                            onClick={() => setView(key)}
                                            className={cn(
                                                'flex items-center gap-2 rounded-full px-4 py-2 transition-colors duration-300',
                                                view === key ? 'bg-ink text-paper' : 'text-ink-mute hover:text-ink',
                                            )}
                                        >
                                            <Icon name={icon} size={15} /> {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                                {[
                                    ['shield', '100% authentic'],
                                    ['truck', `Free over ${money(app.freeDeliveryOver)}`],
                                    ['package', 'Sealed & batch-checked'],
                                ].map(([icon, label]) => (
                                    <div key={label} className="flex flex-col items-center gap-2 rounded-3xl border border-line p-4">
                                        <Icon name={icon} size={20} className="text-teal" />
                                        <span>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Buy box */}
                    <div className="lg:col-span-5">
                        <div className="flex items-center justify-between gap-4">
                            <Link href={shopUrl({ brand: product.brand_slug })} className="eyebrow text-ink-mute transition-colors hover:text-ink">
                                {product.brand}
                            </Link>
                            <button type="button" onClick={share} className="flex items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 text-xs transition-colors hover:border-ink">
                                <Icon name={copied ? 'check' : 'share'} size={14} /> {copied ? 'Link copied' : 'Share'}
                            </button>
                        </div>
                        <h1 className="mt-3 font-display text-4xl leading-[1.02] tracking-[-0.045em] md:text-[3.4rem]">{product.name}</h1>
                        {product.generics && (
                            <Link
                                href={shopUrl({ q: product.generics.split(/[,+]/)[0].trim() })}
                                className="mt-4 inline-flex items-center gap-2 rounded-full bg-mint-soft px-3 py-1.5 text-sm transition-colors hover:bg-mint hover:text-night"
                            >
                                <Icon name="sparkle" size={14} className="text-teal" />
                                <span className="eyebrow text-ink-mute">Contains</span> {product.generics}
                            </Link>
                        )}

                        {!product.in_stock && alternatives.length > 0 && (
                            <a href="#alternatives" className="mt-6 flex items-center gap-4 rounded-3xl border border-coral/30 bg-coral/5 p-4 transition-colors hover:border-coral/60">
                                <Icon name="swap" size={22} className="shrink-0 text-coral" />
                                <span className="flex-1 text-sm">
                                    <strong className="block text-ink">Sold out — {alternatives.length} in-stock alternatives</strong>
                                    <span className="text-ink-mute">
                                        {alternatives[0].same_generic ? `Same active ingredient from ${alternatives[0].brand}` : `Closest match: ${alternatives[0].name}`}
                                    </span>
                                </span>
                                <Icon name="arrow" size={18} />
                            </a>
                        )}

                        {personalOffer && (
                            <div className="mt-8 flex items-start gap-4 rounded-3xl border border-teal/25 bg-mint-soft p-5">
                                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal text-white">
                                    <Icon name="sparkle" size={17} />
                                </span>
                                <div className="min-w-0">
                                    <p className="font-medium">
                                        {personalOffer.label} — {personalOffer.percent}% off, just for you
                                    </p>
                                    <p className="mt-1 text-sm text-ink-soft">
                                        {personalOffer.reason}. Applied automatically in your bag · ends {new Date(personalOffer.expires_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="mt-8 flex items-end justify-between gap-4 border-y border-line py-6">
                            <div>
                                <Price price={product.price} current={product.current_price} personal={personalOffer?.percent ?? 0} size="lg" />
                                <p className="mt-1 text-sm text-ink-mute">Per {product.pack} · incl. taxes</p>
                            </div>
                            <div className="text-right">
                                <p className={cn('flex items-center justify-end gap-2 text-sm', product.in_stock ? 'text-teal' : 'text-coral')}>
                                    <span className={cn('size-2 rounded-full', product.in_stock ? 'bg-teal' : 'bg-coral')} />
                                    {product.in_stock ? (lowStock ? `Only ${product.stock} left` : 'In stock') : 'Out of stock'}
                                </p>
                                {lowStock && (
                                    <span className="mt-2 block h-1 w-28 overflow-hidden rounded-full bg-line">
                                        <span className="block h-full rounded-full bg-coral" style={{ width: `${Math.max(8, product.stock * 10)}%` }} />
                                    </span>
                                )}
                            </div>
                        </div>

                        {product.requires_prescription && (
                            <div className="mt-6 flex gap-3 rounded-3xl bg-mint-soft p-5 text-sm">
                                <Icon name="rx" size={22} className="shrink-0 text-teal" />
                                <p>
                                    This medicine needs a valid prescription. Attach it at checkout, or{' '}
                                    <Link href={route('prescriptions.create')} className="font-medium underline underline-offset-4">
                                        upload it now
                                    </Link>{' '}
                                    and a pharmacist will call you.
                                </p>
                            </div>
                        )}

                        {product.in_stock ? (
                            <div className="mt-6 space-y-3">
                                <div className="flex gap-3">
                                    <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, product.max_quantity)} />
                                    <Button onClick={add} loading={adding} size="lg" className="flex-1" icon={<Icon name="bag" size={18} />}>
                                        Add · {money(product.current_price * qty)}
                                    </Button>
                                </div>
                                <Button onClick={buyNow} variant="ghost" size="lg" className="w-full" icon={<Icon name="arrow" size={18} />}>
                                    Buy now
                                </Button>
                                {savings > 0 && <p className="text-center text-sm text-teal">You save {money(savings)} on this item</p>}
                                {cheapestSame && cheapestSame.current_price < product.current_price && (
                                    <a href="#alternatives" className="block text-center text-sm text-ink-mute underline decoration-line-strong underline-offset-4 hover:text-ink">
                                        Same salt from {money(cheapestSame.current_price)} ({cheapestSame.brand})
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className="mt-6 rounded-3xl border border-line p-5 text-sm text-ink-mute">
                                Temporarily unavailable. Save it to your wishlist, pick an alternative below, or{' '}
                                <Link href={route('contact')} className="underline underline-offset-4">
                                    ask our pharmacist
                                </Link>
                                .
                            </div>
                        )}

                        {/* Delivery estimate */}
                        <div className="mt-6 rounded-3xl border border-line p-5">
                            <div className="flex items-center justify-between gap-3">
                                <p className="flex items-center gap-2 text-sm font-medium">
                                    <Icon name="truck" size={18} className="text-teal" /> Delivery to
                                </p>
                                <Select variant="pill" ariaLabel="Delivery city" value={city} onChange={(v) => setCity(Number(v))} options={DELIVERY.map(([name], i) => ({ value: i, label: name }))} />
                            </div>
                            <p className="mt-3 text-sm text-ink-mute">
                                Arrives in <strong className="text-ink">{DELIVERY[city][1]}</strong> · Cash on delivery · Free over {money(app.freeDeliveryOver)}
                            </p>
                        </div>

                        {/* At a glance */}
                        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line">
                            {facts.map(([k, v]) => (
                                <div key={k} className={cn('bg-paper p-4', k === 'Storage' || k === 'Active ingredient' ? 'col-span-2' : '')}>
                                    <dt className="eyebrow text-ink-mute">{k}</dt>
                                    <dd className="mt-1.5 text-sm">{v}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </section>

            {/* Detailed information with sticky section nav */}
            {sections.length > 0 && (
                <section className="container-x mt-14 md:mt-20">
                    <div className="grid gap-10 lg:grid-cols-12">
                        <nav className="min-w-0 lg:col-span-3" aria-label="On this page">
                            <div className="lg:sticky lg:top-28">
                                <p className="eyebrow text-ink-mute">On this page</p>
                                <ul className="scrollbar-none mt-4 flex gap-2 overflow-x-auto lg:flex-col lg:gap-0 lg:border-l lg:border-line">
                                    {nav.map(([id, label], i) => (
                                        <li key={id} className="shrink-0">
                                            <a
                                                href={`#${id}`}
                                                className={cn(
                                                    'flex items-center gap-3 rounded-full border border-line px-4 py-2 text-sm transition-colors lg:-ml-px lg:rounded-none lg:border-0 lg:border-l-2 lg:py-2.5 lg:pl-5',
                                                    activeSection === id ? 'border-ink bg-ink text-paper lg:border-teal lg:bg-transparent lg:text-ink' : 'text-ink-mute hover:text-ink lg:border-transparent',
                                                )}
                                            >
                                                <span className="font-mono text-[0.65rem] opacity-80">{pad(i + 1)}</span>
                                                {label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </nav>

                        <div className="min-w-0 space-y-4 lg:col-span-9">
                            {sections.map((s, i) => (
                                <article key={s.id} id={s.id} className="scroll-mt-28 rounded-4xl border border-line bg-card p-6 md:p-10" data-reveal>
                                    <div className="flex items-baseline gap-4">
                                        <span className="font-mono text-sm text-teal">{pad(i + 1)}</span>
                                        <h2 className="font-display text-3xl md:text-4xl">{s.title}</h2>
                                    </div>
                                    <div className="prose-care mt-5 max-w-3xl whitespace-pre-line">{s.body}</div>
                                </article>
                            ))}
                            <p className="px-2 pt-2 text-xs leading-relaxed text-ink-mute">
                                Information is provided for reference only and is not a substitute for medical advice. Always read the label and follow your doctor's or
                                pharmacist's directions.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {priceStats && (
                <section id="price-insight" className="container-x mt-16 scroll-mt-28 lg:grid lg:grid-cols-12">
                    <div className="lg:col-span-9 lg:col-start-4" data-reveal>
                        <PriceInsight stats={priceStats} />
                    </div>
                </section>
            )}

            {alternatives.length > 0 && (
                <section id="alternatives" className="container-x scroll-mt-28 py-14 md:py-20">
                    <SectionHeading
                        eyebrow={product.in_stock ? 'Same active ingredient' : 'In stock now'}
                        title={
                            product.in_stock ? (
                                <>
                                    Same salt, <span className="italic">other brands.</span>
                                </>
                            ) : (
                                <>
                                    Sold out? <span className="italic">Try these.</span>
                                </>
                            )
                        }
                        aside={<p className="max-w-xs text-sm">Matched by active ingredient first, then by category and price. Check with your pharmacist before switching brands.</p>}
                    />
                    <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4" data-stagger>
                        {alternatives.map((p) => (
                            <div key={p.id} className="relative">
                                {p.same_generic && (
                                    <span className="absolute -top-3 left-3 z-10 rounded-full bg-mint px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-night">
                                        Same salt
                                    </span>
                                )}
                                <ProductCard product={p} />
                                {p.current_price !== product.current_price && (
                                    <p className={cn('mt-2 px-1 text-xs', p.current_price < product.current_price ? 'text-teal' : 'text-ink-mute')}>
                                        {p.current_price < product.current_price ? `${money(product.current_price - p.current_price)} cheaper` : `${money(p.current_price - product.current_price)} more`}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {related.length > 0 && (
                <section className="container-x py-14 md:py-20">
                    <SectionHeading
                        eyebrow={`More in ${product.department.name}`}
                        title={
                            <>
                                You may also <span className="italic">need.</span>
                            </>
                        }
                    />
                    <ProductRail products={related} className="mt-12" />
                </section>
            )}

            {recent.length > 0 && (
                <section className="container-x pb-10">
                    <SectionHeading
                        eyebrow="Recently viewed"
                        title={
                            <>
                                Pick up where <span className="italic">you left off.</span>
                            </>
                        }
                    />
                    <ProductRail products={recent} className="mt-12" />
                </section>
            )}

            {/* Mobile sticky buy bar */}
            {product.in_stock && (
                <div className="glass fixed bottom-5 left-3 right-24 z-40 flex items-center gap-3 rounded-full border border-line p-2 pl-5 shadow-2xl lg:hidden">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-ink-mute">{product.name}</p>
                        <p className="font-mono text-sm">{money(product.current_price * qty)}</p>
                    </div>
                    <Button onClick={add} loading={adding} icon={<Icon name="bag" size={16} />}>
                        Add
                    </Button>
                </div>
            )}
        </div>
    );
}

/** Id of the section currently nearest the top of the viewport. */
function useScrollSpy(ids) {
    const [active, setActive] = useState(ids[0]);
    const key = ids.join('|');

    useEffect(() => {
        const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
        if (!els.length) return undefined;
        const io = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
                if (visible) setActive(visible.target.id);
            },
            { rootMargin: '-20% 0px -65% 0px' },
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return active;
}
