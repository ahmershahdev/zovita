import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Magnetic from '@/Components/motion/Magnetic';
import Marquee from '@/Components/motion/Marquee';
import ProductRail from '@/Components/product/ProductRail';
import LazyHeroScene from '@/Components/three/LazyHeroScene';
import Button from '@/Components/ui/Button';
import Icon from '@/Components/ui/Icon';
import SectionHeading from '@/Components/ui/SectionHeading';
import { useVariant } from '@/hooks/usePersonal';
import useReveal from '@/hooks/useReveal';
import useT from '@/hooks/useT';
import { cn } from '@/lib/cn';
import { pad } from '@/lib/format';
import { gsap, prefersReducedMotion, ScrollTrigger } from '@/lib/gsap';
import { shopUrl } from '@/lib/shopUrl';
import { track } from '@/lib/signals';

export default function Home({ departments, featured, deals, supplements, brands, conditions, stats, rails = {} }) {
    const scope = useRef(null);
    useReveal(scope);

    return (
        <div ref={scope}>
            <Head title="Online pharmacy — care, delivered" />

            <Hero stats={stats} />
            <TrustMarquee />
            <ForYou rails={rails} />
            <Departments departments={departments} />
            <BodyMapTeaser />

            <section className="container-x py-14 md:py-20">
                <SectionHeading
                    index="02"
                    eyebrow="Pharmacist picks"
                    title={
                        <>
                            Everyday essentials, <span className="italic">handpicked.</span>
                        </>
                    }
                    aside={<Button href={route('shop.index')} variant="ghost" icon={<Icon name="arrow" size={16} />}>Shop all</Button>}
                />
                <ProductRail products={featured} className="mt-14" />
            </section>

            <Conditions conditions={conditions} />
            <PrescriptionSteps />

            <section className="container-x py-14 md:py-20">
                <SectionHeading
                    index="05"
                    eyebrow="On offer now"
                    title={
                        <>
                            Care that costs <span className="italic">less.</span>
                        </>
                    }
                    aside={<p className="max-w-xs text-sm">Real savings on authentic stock — prices checked against the pharmacy shelf.</p>}
                />
                <ProductRail products={deals} className="mt-14" />
            </section>

            <Brands brands={brands} total={stats.brands} />

            <section className="container-x py-14 md:py-20">
                <SectionHeading
                    index="07"
                    eyebrow="Vitamins & supplements"
                    title={
                        <>
                            Build a routine that <span className="italic">sticks.</span>
                        </>
                    }
                    aside={
                        <Button href={route('shop.department', 'vitamins-supplements')} variant="ghost" icon={<Icon name="arrow" size={16} />}>
                            All supplements
                        </Button>
                    }
                />
                <ProductRail products={supplements} className="mt-14" />
            </section>

            <OurPromise stats={stats} departments={departments} />
        </div>
    );
}

function Hero({ stats }) {
    const { app } = usePage().props;
    const t = useT();
    // A/B experiment "hero_cta": which first step converts better.
    const heroCta = useVariant('hero_cta');
    useEffect(() => track('hero_cta', 'exposure'), []);
    const [query, setQuery] = useState('');
    const root = useRef(null);

    useLayoutEffect(() => {
        if (prefersReducedMotion()) return undefined;
        const ctx = gsap.context(() => {
            gsap.from('[data-hero-line] > span', { yPercent: 115, duration: 1.5, stagger: 0.1, delay: 0.15 });
            gsap.from('[data-hero-fade]', { opacity: 0, y: 24, duration: 1.2, stagger: 0.08, delay: 0.6 });
            gsap.from('[data-hero-canvas]', { opacity: 0, scale: 0.92, duration: 2, delay: 0.2 });
        }, root);
        return () => ctx.revert();
    }, []);

    const search = (e) => {
        e.preventDefault();
        if (query.trim()) router.get(shopUrl({ q: query.trim() }));
    };

    return (
        <section ref={root} className="relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_40%,var(--color-mint-soft)_0%,transparent_55%)]" />
            <div data-hero-canvas className="pointer-events-none absolute inset-0 md:left-[30%]">
                <LazyHeroScene
                    fallback={<img src={`${app.url}/images/hero/hero.webp`} alt="" className="absolute right-0 top-1/2 w-[60%] -translate-y-1/2 object-contain opacity-90" />}
                />
            </div>

            <div className="container-x relative flex min-h-[calc(100svh-7.5rem)] flex-col justify-between gap-12 pb-10 pt-14 md:pt-20">
                <div>
                    <p data-hero-fade className="eyebrow mb-8 flex items-center gap-3 text-ink-mute">
                        <span className="size-2 animate-pulse rounded-full bg-teal" />
                        Online pharmacy · Since 2026
                    </p>
                    <h1 className="font-display text-display">
                        <span data-hero-line className="line-mask">
                            <span className="block">Care,</span>
                        </span>
                        <span data-hero-line className="line-mask">
                            <span className="block italic text-teal">delivered</span>
                        </span>
                        <span data-hero-line className="line-mask">
                            <span className="block">with calm.</span>
                        </span>
                    </h1>
                </div>

                <div className="grid gap-10 md:grid-cols-12 md:items-end">
                    <div className="md:col-span-5">
                        <p data-hero-fade className="max-w-md text-lg leading-relaxed text-ink-soft">
                            {t(":products+ authentic medicines, syrups and supplements from :brands trusted brands — checked by a pharmacist, paid on delivery.", { products: stats.products, brands: stats.brands })}
                        </p>
                        <form data-hero-fade onSubmit={search} className="mt-8 flex max-w-md items-center gap-2 rounded-full border border-line-strong bg-card/80 p-1.5 pl-5 backdrop-blur focus-within:border-ink">
                            <Icon name="search" size={18} className="text-ink-mute" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Try “Panadol” or “Vitamin D”"
                                className="min-w-0 flex-1 bg-transparent py-2 focus:outline-none"
                                aria-label="Search the pharmacy"
                            />
                            <button className="h-11 rounded-full bg-ink px-5 text-sm text-paper transition hover:bg-teal">Search</button>
                        </form>
                    </div>
                    <div data-hero-fade className="flex flex-wrap items-center gap-3 md:col-span-7 md:justify-end">
                        <Magnetic>
                            {heroCta === 'symptom' ? (
                                <Button href={route('body-map')} onClick={() => track('hero_cta', 'click')} size="lg" icon={<Icon name="body" size={18} />}>
                                    Start from a symptom
                                </Button>
                            ) : (
                                <Button href={route('shop.index')} onClick={() => track('hero_cta', 'click')} size="lg" icon={<Icon name="arrowUpRight" size={18} />}>
                                    Shop the pharmacy
                                </Button>
                            )}
                        </Magnetic>
                        <Magnetic>
                            <Button href={route('prescriptions.create')} size="lg" variant="ghost" icon={<Icon name="upload" size={18} />}>
                                Upload prescription
                            </Button>
                        </Magnetic>
                    </div>
                </div>
            </div>
        </section>
    );
}

function TrustMarquee() {
    const items = ['100% authentic stock', 'Pharmacist verified', 'Cash on delivery', 'Delivery in 1–3 days', 'Easy returns', 'Licensed pharmacy partners'];
    return (
        <div className="border-y border-night bg-mint py-5 text-night">
            <Marquee duration={40}>
                {items.map((item) => (
                    <span key={item} className="flex items-center gap-8 px-4 font-display text-3xl md:text-4xl">
                        {item}
                        <Icon name="spark" size={22} className="text-night" />
                    </span>
                ))}
            </Marquee>
        </div>
    );
}

/** Index-style department list with a cursor-following image preview (desktop). */
function Departments({ departments }) {
    const preview = useRef(null);
    const [active, setActive] = useState(null);

    const onMove = (e) => {
        if (!preview.current) return;
        gsap.to(preview.current, { x: e.clientX, y: e.clientY, duration: 0.7, ease: 'expo.out' });
    };

    return (
        <section className="container-x py-14 md:py-20" onPointerMove={onMove}>
            <SectionHeading
                index="01"
                eyebrow="Departments"
                title={
                    <>
                        Everything your <span className="italic">cabinet</span> needs.
                    </>
                }
                aside={<p className="max-w-xs text-sm">Eight aisles, organised the way pharmacists think — so you find the right thing, fast.</p>}
            />

            <ul className="mt-14 border-t border-ink" onPointerLeave={() => setActive(null)}>
                {departments.map((d, i) => (
                    <li key={d.slug} className="border-b border-line-strong" data-reveal>
                        <Link
                            href={route('shop.department', d.slug)}
                            onPointerEnter={() => setActive(d)}
                            className="group grid grid-cols-12 items-center gap-4 py-6 transition-colors duration-500 md:py-8"
                        >
                            <span className="col-span-2 font-mono text-sm text-ink-mute md:col-span-1">{pad(i + 1)}</span>
                            <span className="col-span-10 font-display text-4xl transition-transform duration-700 ease-[var(--ease-expo)] group-hover:translate-x-4 group-hover:italic md:col-span-6 md:text-6xl">
                                {d.name}
                            </span>
                            <span className="col-span-8 col-start-3 text-sm text-ink-mute md:col-span-3 md:col-start-auto">{d.blurb}</span>
                            <span className="col-span-2 flex items-center justify-end gap-3 md:col-span-2">
                                <span className="hidden font-mono text-sm md:inline">{d.count}</span>
                                <span className="grid size-11 place-items-center rounded-full border border-line-strong transition duration-500 group-hover:rotate-[-45deg] group-hover:bg-ink group-hover:text-paper">
                                    <Icon name="arrow" size={18} />
                                </span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>

            <div
                ref={preview}
                className="pointer-events-none fixed left-0 top-0 z-40 hidden -translate-x-1/2 -translate-y-1/2 md:block"
                aria-hidden="true"
            >
                <div
                    className="grid size-56 place-items-center overflow-hidden rounded-4xl bg-card shadow-2xl transition-[opacity,transform] duration-500 ease-[var(--ease-expo)]"
                    style={{ opacity: active ? 1 : 0, transform: `scale(${active ? 1 : 0.6}) rotate(${active ? -4 : 0}deg)` }}
                >
                    {active?.image && <img src={active.image} alt="" className="size-44 object-contain mix-blend-multiply" />}
                </div>
            </div>
        </section>
    );
}

function Conditions({ conditions }) {
    return (
        <section className="bg-paper-deep py-14 md:py-20">
            <div className="container-x">
                <SectionHeading
                    index="03"
                    eyebrow="Shop by concern"
                    title={
                        <>
                            Start with how <span className="italic">you feel.</span>
                        </>
                    }
                />
                <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-9" data-stagger>
                    {conditions.map((c) => (
                        <Link
                            key={c.label}
                            href={c.href}
                            className="group relative flex flex-col items-center gap-4 rounded-4xl bg-card p-5 text-center transition duration-500 hover:-translate-y-1.5 hover:bg-ink hover:text-paper lg:col-span-1"
                        >
                            <span className="grid aspect-square w-full place-items-center overflow-hidden rounded-3xl bg-paper transition group-hover:bg-ink-soft">
                                <img src={c.image} alt="" loading="lazy" className="w-3/4 object-contain transition duration-700 group-hover:scale-110" />
                            </span>
                            <span className="text-sm font-medium">{c.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

/** Pinned horizontal walkthrough of the prescription flow (desktop); stacked on mobile. */
function PrescriptionSteps() {
    const section = useRef(null);
    const track = useRef(null);

    const steps = [
        { icon: 'upload', title: 'Upload', body: 'Snap a photo or attach a PDF of your prescription. It is stored privately and only seen by our pharmacists.' },
        { icon: 'phone', title: 'We call you', body: 'A licensed pharmacist confirms medicines, dosage, substitutes and the final price — no surprises.' },
        { icon: 'package', title: 'Packed with care', body: 'Sealed, batch-checked stock, packed for the journey with the right handling for each item.' },
        { icon: 'truck', title: 'At your door', body: 'Delivered in 1–3 days in major cities. Pay cash when it arrives.' },
    ];

    useLayoutEffect(() => {
        if (prefersReducedMotion()) return undefined;
        const mm = gsap.matchMedia();
        mm.add('(min-width: 1024px)', () => {
            const distance = () => track.current.scrollWidth - window.innerWidth + 96;
            gsap.to(track.current, {
                x: () => -distance(),
                ease: 'none',
                scrollTrigger: {
                    trigger: section.current,
                    start: 'top top',
                    end: () => `+=${distance()}`,
                    pin: true,
                    scrub: 1,
                    invalidateOnRefresh: true,
                },
            });
        });
        ScrollTrigger.refresh();
        return () => mm.revert();
    }, []);

    return (
        <section ref={section} className="grain relative overflow-hidden bg-night text-snow">
            <div className="container-x flex min-h-svh flex-col justify-center gap-14 py-16">
                <SectionHeading
                    dark
                    index="04"
                    eyebrow="Prescription service"
                    title={
                        <>
                            Your prescription, <span className="italic text-mint">handled.</span>
                        </>
                    }
                    aside={
                        <Button href={route('prescriptions.create')} variant="mint" icon={<Icon name="upload" size={16} />}>
                            Upload now
                        </Button>
                    }
                />
                <div ref={track} className="flex flex-col gap-5 lg:w-max lg:flex-row">
                    {steps.map((s, i) => (
                        <article key={s.title} className="flex min-h-72 flex-col justify-between rounded-4xl border border-snow/15 bg-night-soft/70 p-8 lg:w-[34vw]">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-sm text-mint">Step {pad(i + 1)}</span>
                                <span className="grid size-14 place-items-center rounded-full bg-mint text-night">
                                    <Icon name={s.icon} size={24} />
                                </span>
                            </div>
                            <div>
                                <h3 className="mt-10 font-display text-5xl md:text-6xl">{s.title}</h3>
                                <p className="mt-4 max-w-md text-snow/70">{s.body}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Brands({ brands, total }) {
    if (!brands.length) return null;
    return (
        <section className="border-y border-line py-16">
            <p className="eyebrow container-x mb-10 text-ink-mute">Featured partners · {total} brands and manufacturers in stock</p>
            <Marquee duration={45} itemClassName="gap-4 pr-4">
                {brands.map((b) => (
                    <Link
                        key={b.slug}
                        href={shopUrl({ brand: b.slug })}
                        className="grid h-24 w-44 place-items-center rounded-3xl bg-card px-6 grayscale transition duration-500 hover:grayscale-0"
                        title={b.name}
                    >
                        <img src={b.logo} alt={b.name} loading="lazy" className="max-h-14 max-w-full object-contain mix-blend-multiply" />
                    </Link>
                ))}
            </Marquee>
        </section>
    );
}

function OurPromise({ stats, departments }) {
    const items = [
        { value: `${stats.products}+`, label: 'Products in stock', body: 'Medicines, syrups, supplements and devices across eight departments.' },
        { value: `${stats.brands}`, label: 'Brands & manufacturers', body: 'Sourced through recognised distribution channels only.' },
        { value: '1–3', label: 'Day delivery', body: 'Across Karachi, Lahore, Islamabad and other major cities.' },
        { value: '0', label: 'Upfront payment', body: 'Cash on delivery on every order. Check it before you pay.' },
    ];

    return (
        <section className="container-x py-14 md:py-20">
            <SectionHeading
                index="08"
                eyebrow="Our promise"
                title={
                    <>
                        Calm, honest, <span className="italic">careful.</span>
                    </>
                }
            />
            <div className="mt-14 grid gap-px overflow-hidden rounded-4xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4" data-stagger>
                {items.map((item) => (
                    <div key={item.label} className="bg-paper p-8">
                        <p className="font-display text-7xl leading-none">{item.value}</p>
                        <p className="eyebrow mt-6">{item.label}</p>
                        <p className="mt-3 text-sm text-ink-mute">{item.body}</p>
                    </div>
                ))}
            </div>
            <CatalogChart departments={departments} />
        </section>
    );
}

/** Teaser for the 3D body map: an outlined figure with pulsing hotspots. */
function BodyMapTeaser() {
    const spots = [
        ['Head & mind', 50, 9],
        ['Throat', 50, 19],
        ['Chest', 44, 30],
        ['Stomach', 55, 42],
        ['Back', 47, 38],
        ['Joints', 30, 50],
        ['Knees', 42, 72],
    ];

    return (
        <section className="container-x py-12">
            <Link
                href={route('body-map')}
                data-cursor="Explore"
                className="group grain relative grid overflow-hidden rounded-5xl bg-night text-snow md:grid-cols-12"
                data-reveal
            >
                <div className="relative z-10 flex flex-col justify-between gap-10 p-8 md:col-span-7 md:p-14">
                    <p className="eyebrow flex items-center gap-3 text-mint">
                        <span className="rounded-full bg-mint px-2 py-0.5 text-night">New</span> Interactive body map
                    </p>
                    <div>
                        <h2 className="font-display text-title">
                            Point to where it <span className="italic text-mint">hurts.</span>
                        </h2>
                        <p className="mt-6 max-w-md text-snow/70">
                            Rotate a 3D body, tap the area that's bothering you and get self-care tips, warning signs and pharmacist picks in seconds.
                        </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-3 rounded-full bg-mint px-6 py-4 font-medium text-night transition-transform duration-500 group-hover:translate-x-2">
                        Open the body map <Icon name="arrow" size={18} />
                    </span>
                </div>
                <div className="relative min-h-80 md:col-span-5">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 m-auto h-[90%] text-snow/25 transition-transform duration-[1.2s] ease-[var(--ease-expo)] group-hover:scale-105" fill="none" stroke="currentColor" strokeWidth="0.6" aria-hidden="true">
                        <circle cx="50" cy="9" r="6" />
                        <path d="M46 15h8v5h-8zM36 22h28l3 26h-6l-1 12H40l-1-12h-6zM36 22l-8 26 4 2 6-18M64 22l8 26-4 2-6-18M40 60l-2 36h6l4-30 4 30h6l-2-36" />
                    </svg>
                    {spots.map(([label, x, y], i) => (
                        <span key={label} className="absolute" style={{ left: `${x}%`, top: `${y + 4}%` }}>
                            <span className="relative flex size-3 -translate-x-1/2 -translate-y-1/2">
                                <span className="absolute inset-0 rounded-full bg-mint [animation:pulse-ring_2.2s_ease-out_infinite]" style={{ animationDelay: `${i * 0.3}s` }} />
                                <span className="relative size-3 rounded-full bg-mint" />
                            </span>
                        </span>
                    ))}
                </div>
            </Link>
        </section>
    );
}

/**
 * Real catalog breakdown: products per department as a single-series horizontal bar chart
 * (direct-labelled, no legend needed), with hover/focus highlight and link-through.
 */
function CatalogChart({ departments }) {
    const [active, setActive] = useState(null);
    const max = Math.max(...departments.map((d) => d.count), 1);
    const total = departments.reduce((sum, d) => sum + d.count, 0);

    return (
        <figure className="mt-14 rounded-4xl border border-line bg-card p-6 md:p-10" data-reveal>
            <figcaption className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="eyebrow text-ink-mute">Catalog at a glance</p>
                    <p className="mt-2 font-display text-3xl">
                        {total.toLocaleString()} products across {departments.length} aisles
                    </p>
                </div>
                <p className="text-sm text-ink-mute">Live from our shelves · updated with every catalog import</p>
            </figcaption>
            <ul className="mt-8 space-y-2">
                {departments.map((d) => {
                    const share = Math.round((d.count / total) * 100);
                    return (
                        <li key={d.slug}>
                            <Link
                                href={route('shop.department', d.slug)}
                                onPointerEnter={() => setActive(d.slug)}
                                onPointerLeave={() => setActive(null)}
                                onFocus={() => setActive(d.slug)}
                                onBlur={() => setActive(null)}
                                className="group grid grid-cols-12 items-center gap-3 rounded-xl py-1.5 text-sm"
                            >
                                <span className="col-span-4 truncate md:col-span-3">{d.name}</span>
                                <span className="col-span-6 h-7 md:col-span-8" aria-hidden="true">
                                    <span
                                        className="block h-full origin-left rounded-r-[4px] transition-[opacity,transform] duration-700 ease-[var(--ease-expo)]"
                                        style={{
                                            width: `${(d.count / max) * 100}%`,
                                            background: 'var(--color-viz)',
                                            opacity: active && active !== d.slug ? 0.35 : 1,
                                        }}
                                    />
                                </span>
                                <span className="col-span-2 text-right font-mono md:col-span-1">
                                    {d.count}
                                    <span className={cn('block text-[0.65rem] text-ink-mute transition-opacity', active === d.slug ? 'opacity-100' : 'opacity-0')}>{share}%</span>
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </figure>
    );
}

/** Rails learnt from this visitor: what they keep buying and what fits what they browse. */
function ForYou({ rails }) {
    const { personal, auth } = usePage().props;
    const hasForYou = rails.for_you?.length > 0;
    const hasAgain = rails.buy_again?.length > 0;
    if (!hasForYou && !hasAgain) return null;

    return (
        <section className="container-x py-14 md:py-20" aria-labelledby="for-you-title">
            <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                    <p className="eyebrow flex items-center gap-2 text-teal">
                        <Icon name="sparkle" size={13} /> {auth.user ? `For you, ${auth.user.name.split(' ')[0]}` : 'For you'}
                    </p>
                    <h2 id="for-you-title" className="mt-4 font-display text-title">
                        {hasAgain ? (
                            <>
                                Ready for a <span className="italic">refill?</span>
                            </>
                        ) : (
                            <>
                                Picked from what <span className="italic">you browse.</span>
                            </>
                        )}
                    </h2>
                    {rails.top_categories?.length > 0 && (
                        <p className="mt-4 max-w-xl text-ink-soft">Because you've been looking at {rails.top_categories.join(', ')}.</p>
                    )}
                </div>
                {personal?.count > 0 && (
                    <Link href={route('cart.index')} className="flex items-center gap-3 rounded-full bg-mint-soft px-5 py-3 text-sm text-teal">
                        <Icon name="sparkle" size={15} /> {personal.count} personal {personal.count === 1 ? 'offer' : 'offers'} waiting
                    </Link>
                )}
            </div>
            {hasAgain && (
                <>
                    <p className="eyebrow mt-12 text-ink-mute">Buy again</p>
                    <ProductRail products={rails.buy_again} className="mt-6" />
                </>
            )}
            {hasForYou && (
                <>
                    <p className="eyebrow mt-12 text-ink-mute">Picked for you</p>
                    <ProductRail products={rails.for_you} className="mt-6" />
                </>
            )}
        </section>
    );
}
