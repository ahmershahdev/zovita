import { Head, Link } from '@inertiajs/react';
import { lazy, useEffect, useRef, useState } from 'react';
import ProductCard from '@/Components/product/ProductCard';
import LazyScene from '@/Components/three/LazyScene';
import Icon from '@/Components/ui/Icon';
import useReveal from '@/hooks/useReveal';
import useTheme from '@/hooks/useTheme';
import { cn } from '@/lib/cn';
import { pad } from '@/lib/format';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';

const BodyScene = lazy(() => import('@/Components/three/BodyScene'));

/** Regions that exist on the 3D model (the rest are chips beside it). */
const ON_MODEL = ['head', 'face', 'chest', 'back', 'abdomen', 'pelvis', 'arms', 'legs'];

export default function BodyMap({ regions }) {
    const scope = useRef(null);
    const results = useRef(null);
    const { isDark } = useTheme();
    const [region, setRegion] = useState(null);
    const [hovered, setHovered] = useState(null);
    const [facing, setFacing] = useState('front');
    const [symptom, setSymptom] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    useReveal(scope);

    const byKey = Object.fromEntries(regions.map((r) => [r.key, r]));
    const current = region ? byKey[region] : null;

    const pickRegion = (key) => {
        if (!key || !byKey[key]) return;
        setRegion(key);
        setSymptom(null);
        setData(null);
        if (key === 'back') setFacing('back');
        else if (ON_MODEL.includes(key)) setFacing('front');
    };

    // Fetch recommendations for the chosen symptom; stale requests are aborted.
    useEffect(() => {
        if (!symptom) return undefined;
        const controller = new AbortController();
        setLoading(true);
        setError(false);
        fetch(route('body-map.recommend', symptom), { signal: controller.signal, headers: { Accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : Promise.reject(r)))
            .then((json) => {
                setData(json);
                requestAnimationFrame(() => results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            })
            .catch((e) => e?.name !== 'AbortError' && setError(true))
            .finally(() => setLoading(false));
        return () => controller.abort();
    }, [symptom]);

    const label = (key) => byKey[key]?.label ?? '';

    return (
        <div ref={scope}>
            <Head title="Body map — find relief by symptom">
                <meta head-key="description" name="description" content="Tap where it hurts on an interactive 3D body map to find pharmacist-curated products, self-care tips and when to see a doctor." />
            </Head>
            <div className="container-x pt-8 md:pt-10">
                <Breadcrumbs items={[{ label: 'Body map' }]} />
            </div>

            <section className="container-x pt-8 md:pt-14">
                <div className="grid gap-6 md:grid-cols-12 md:items-end">
                    <div className="md:col-span-8">
                        <p className="eyebrow flex items-center gap-3 text-ink-mute">
                            <span className="size-2 animate-pulse rounded-full bg-teal" /> Symptom navigator
                        </p>
                        <h1 className="mt-5 font-display text-display" data-split="now">
                            Where does it <span className="italic text-teal">hurt?</span>
                        </h1>
                    </div>
                    <p className="max-w-sm text-ink-soft md:col-span-4 md:justify-self-end" data-reveal>
                        Tap a part of the body, pick what you're feeling, and we'll show self-care tips, warning signs and products our pharmacists would reach for.
                    </p>
                </div>
            </section>

            <section className="container-x mt-12">
                <div className="grid gap-6 lg:grid-cols-12">
                    {/* 3D model */}
                    <div className="relative min-h-[34rem] overflow-hidden rounded-5xl border border-line bg-[radial-gradient(ellipse_at_50%_35%,var(--color-card),var(--color-paper-deep))] lg:col-span-7 lg:min-h-[44rem]">
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
                        <LazyScene
                            Scene={BodyScene}
                            interactive
                            className="absolute inset-0"
                            selected={region}
                            hovered={hovered}
                            onHover={setHovered}
                            onSelect={pickRegion}
                            facing={facing}
                            dark={isDark}
                            fallback={
                                <div className="absolute inset-0 grid place-items-center p-8 text-center text-sm text-ink-mute">
                                    <p>
                                        <Icon name="body" size={48} className="mx-auto mb-4 text-ink/30" />
                                        Choose an area from the list to begin.
                                    </p>
                                </div>
                            }
                        />

                        <div className="pointer-events-none absolute inset-x-5 top-5 flex items-start justify-between gap-4">
                            <p className="eyebrow rounded-full bg-paper/80 px-3 py-1.5 text-ink-mute backdrop-blur">Drag to rotate · Click to select</p>
                            <p className={cn('eyebrow rounded-full bg-night px-3 py-1.5 text-snow transition-opacity duration-300', hovered ? 'opacity-100' : 'opacity-0')} aria-live="polite">
                                {label(hovered)}
                            </p>
                        </div>

                        <div className="glass absolute bottom-5 left-1/2 flex -translate-x-1/2 rounded-full border border-line p-1 text-sm">
                            {['front', 'back'].map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => setFacing(f)}
                                    aria-pressed={facing === f}
                                    className={cn('rounded-full px-5 py-2 capitalize transition-colors', facing === f ? 'bg-ink text-paper' : 'text-ink-mute hover:text-ink')}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="flex flex-col gap-4 lg:col-span-5">
                        <Step n={1} title="Choose an area" done={!!region}>
                            <ul className="flex flex-wrap gap-2">
                                {regions.map((r) => (
                                    <li key={r.key}>
                                        <button
                                            type="button"
                                            onClick={() => pickRegion(r.key)}
                                            onMouseEnter={() => ON_MODEL.includes(r.key) && setHovered(r.key)}
                                            onMouseLeave={() => setHovered(null)}
                                            aria-pressed={region === r.key}
                                            className={cn(
                                                'rounded-full border px-4 py-2 text-sm transition-colors duration-300',
                                                region === r.key ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink',
                                            )}
                                        >
                                            {r.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Step>

                        <Step n={2} title={current ? `What are you feeling? · ${current.label}` : 'What are you feeling?'} done={!!symptom} disabled={!current}>
                            {current ? (
                                <ul key={current.key} className="grid gap-2 sm:grid-cols-2" data-stagger>
                                    {current.symptoms.map((s) => (
                                        <li key={s.key}>
                                            <button
                                                type="button"
                                                onClick={() => setSymptom(s.key)}
                                                aria-pressed={symptom === s.key}
                                                className={cn(
                                                    'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors duration-300',
                                                    symptom === s.key ? 'border-teal bg-mint-soft' : 'border-line hover:border-ink',
                                                    s.urgent && 'border-coral/40',
                                                )}
                                            >
                                                <span>{s.label}</span>
                                                {s.urgent ? <Icon name="alert" size={16} className="text-coral" /> : <Icon name="arrow" size={14} className="opacity-40" />}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-ink-mute">Pick an area on the model or from the list above.</p>
                            )}
                        </Step>

                        <p className="px-2 text-xs leading-relaxed text-ink-mute">
                            This tool helps you navigate the store — it does not diagnose. In an emergency call <strong className="text-ink">1122</strong>. Always follow your doctor's or
                            pharmacist's advice.
                        </p>
                    </div>
                </div>
            </section>

            {/* Results */}
            <section ref={results} className="container-x scroll-mt-28 pt-16" aria-live="polite">
                {loading && <p className="animate-pulse text-sm text-ink-mute">Finding the right care…</p>}
                {error && <p className="text-sm text-coral">We couldn't load suggestions. Please try again.</p>}
                {data && !loading && <Results data={data} regionLabel={label(data.symptom.region)} />}
            </section>
        </div>
    );
}

function Step({ n, title, done, disabled, children }) {
    return (
        <div className={cn('rounded-4xl border border-line bg-card p-6 transition-opacity duration-500', disabled && 'opacity-50')}>
            <div className="mb-5 flex items-center gap-3">
                <span className={cn('grid size-8 place-items-center rounded-full font-mono text-xs transition-colors', done ? 'bg-teal text-white' : 'border border-line-strong')}>
                    {done ? <Icon name="check" size={14} /> : pad(n)}
                </span>
                <h2 className="font-display text-2xl">{title}</h2>
            </div>
            {children}
        </div>
    );
}

function Results({ data, regionLabel }) {
    const { symptom, products, categories } = data;

    if (symptom.urgent) {
        return (
            <div className="grain relative overflow-hidden rounded-5xl bg-coral p-8 text-white md:p-14">
                <p className="eyebrow flex items-center gap-2">
                    <Icon name="alert" size={16} /> Urgent · {symptom.label}
                </p>
                <p className="mt-5 max-w-3xl font-display text-4xl leading-tight md:text-6xl">{symptom.note}</p>
                <p className="mt-6 max-w-2xl text-white/85">Warning signs: {symptom.flags}</p>
                <a href="tel:1122" className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-6 py-4 font-medium text-coral">
                    <Icon name="phone" size={18} /> Call 1122 now
                </a>
            </div>
        );
    }

    return (
        <div>
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-4xl bg-night p-8 text-snow md:col-span-2">
                    <p className="eyebrow text-mint">
                        {regionLabel} · {symptom.label}
                    </p>
                    <p className="mt-4 font-display text-3xl leading-tight md:text-4xl">{symptom.note}</p>
                    {categories.length > 0 && (
                        <ul className="mt-8 flex flex-wrap gap-2">
                            {categories.map((c) => (
                                <li key={c.href}>
                                    <Link href={c.href} className="inline-flex items-center gap-2 rounded-full border border-snow/25 px-4 py-2 text-sm transition-colors hover:bg-snow hover:text-night">
                                        {c.name} <Icon name="arrowUpRight" size={14} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="rounded-4xl border border-coral/30 bg-coral/5 p-8">
                    <p className="eyebrow flex items-center gap-2 text-coral">
                        <Icon name="alert" size={14} /> See a doctor if
                    </p>
                    <p className="mt-4 text-ink-soft">{symptom.flags}</p>
                </div>
            </div>

            {products.length > 0 ? (
                <>
                    <h3 className="mt-16 font-display text-title">
                        Pharmacist <span className="italic">picks.</span>
                    </h3>
                    <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                        {products.map((p) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </>
            ) : (
                <p className="mt-10 text-sm text-ink-mute">No matching products are listed right now — our pharmacists can still help via the contact page.</p>
            )}
        </div>
    );
}
