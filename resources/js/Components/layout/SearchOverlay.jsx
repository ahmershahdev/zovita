import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import { money } from '@/lib/format';
import Overlay from './Overlay';

const popular = ['Panadol', 'Vitamin C', 'Sunscreen', 'Cough syrup', 'Biotin', 'Omega 3', 'BP monitor', 'Ensure'];

export default function SearchOverlay({ open, onClose }) {
    return (
        <Overlay open={open} onClose={onClose} label="Search" className="shadow-2xl">
            <SearchPanel onClose={onClose} />
        </Overlay>
    );
}

function SearchPanel({ onClose }) {
    const [term, setTerm] = useState('');
    const [results, setResults] = useState({ products: [], categories: [] });
    const [loading, setLoading] = useState(false);
    const input = useRef(null);

    useEffect(() => {
        input.current?.focus();
    }, []);

    // Debounced instant search; aborts stale requests.
    useEffect(() => {
        if (term.trim().length < 2) {
            setResults({ products: [], categories: [] });
            return undefined;
        }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(route('search.suggest', { q: term }), {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' },
                });
                if (res.ok) setResults(await res.json());
            } catch {
                /* aborted or offline */
            } finally {
                setLoading(false);
            }
        }, 180);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [term]);

    const submit = (e) => {
        e.preventDefault();
        if (!term.trim()) return;
        router.get(route('shop.index'), { q: term.trim() });
        onClose();
    };

    return (
        <div className="container-x pb-10 pt-6">
            <form onSubmit={submit} className="flex items-center gap-4 border-b border-ink pb-4">
                <Icon name="search" size={28} />
                <input
                    ref={input}
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Search 475+ medicines, syrups, supplements…"
                    className="min-w-0 flex-1 bg-transparent font-display text-3xl placeholder:text-ink-mute/50 focus:outline-none md:text-5xl"
                    aria-label="Search products"
                />
                {loading && <span className="size-5 animate-spin rounded-full border-2 border-ink border-r-transparent" />}
                <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full border border-line-strong transition hover:bg-ink hover:text-paper" aria-label="Close search">
                    <Icon name="close" />
                </button>
            </form>

            {term.trim().length < 2 ? (
                <div className="mt-8">
                    <p className="eyebrow text-ink-mute">Popular searches</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {popular.map((p) => (
                            <button key={p} type="button" onClick={() => setTerm(p)} className="rounded-full border border-line-strong px-4 py-2 text-sm transition hover:bg-ink hover:text-paper">
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="mt-8 grid gap-10 md:grid-cols-12">
                    <div className="md:col-span-8">
                        <p className="eyebrow mb-3 text-ink-mute">Products</p>
                        {results.products.length === 0 && !loading && <p className="text-ink-mute">No matches for “{term}”. Try a brand or salt name.</p>}
                        <ul className="divide-y divide-line">
                            {results.products.map((p) => (
                                <li key={p.id}>
                                    <Link href={route('products.show', p.slug)} onClick={onClose} className="group flex items-center gap-4 py-3">
                                        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-card">
                                            <img src={p.image} alt="" className="size-14 object-contain" loading="lazy" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-medium group-hover:underline">{p.name}</span>
                                            <span className="eyebrow text-ink-mute">{p.brand}</span>
                                        </span>
                                        <span className="font-medium">{money(p.current_price)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        {results.products.length > 0 && (
                            <button type="button" onClick={submit} className="mt-4 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">
                                See all results for “{term}” <Icon name="arrow" size={16} />
                            </button>
                        )}
                    </div>
                    {results.categories.length > 0 && (
                        <div className="md:col-span-4">
                            <p className="eyebrow mb-3 text-ink-mute">Categories</p>
                            <ul className="space-y-2">
                                {results.categories.map((c) => (
                                    <li key={c.slug}>
                                        <Link href={route('shop.index', { category: c.slug })} onClick={onClose} className="font-display text-2xl hover:italic">
                                            {c.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
