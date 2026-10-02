import { router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import AdminLayout, { PageGuide, Pager, Panel, StatusPill } from '@/Layouts/AdminLayout';
import { cn } from '@/lib/cn';

const FILTERS = [
    ['', 'All'],
    ['low', 'Low stock'],
    ['out', 'Sold out'],
    ['hidden', 'No photo (hidden)'],
];

export default function Products({ products, filters }) {
    const [q, setQ] = useState(filters.q ?? '');

    useEffect(() => {
        if (q === (filters.q ?? '')) return undefined;
        const t = setTimeout(() => router.get(route('admin.products.index'), { ...filters, q: q || undefined }, { preserveState: true, replace: true }), 350);
        return () => clearTimeout(t);
    }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AdminLayout title="Products">
            <PageGuide
                id="products"
                steps={[
                    "Search for a product by name, brand or ingredient.",
                    "Change the stock number when new boxes arrive, or the price, then press “Save” on that row.",
                    "“Sale” is an optional lower price shown with the old price crossed out. Leave it empty for no sale.",
                    "“Hidden” products have no photo, so customers can’t see them in the shop.",
                ]}
            />
            <Panel>
                <div className="mb-6 flex flex-wrap items-center gap-3">
                    <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-line-strong bg-paper px-4 sm:max-w-sm">
                        <Icon name="search" size={16} className="text-ink-mute" />
                        <span className="sr-only">Search products</span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, brand or ingredient" className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
                    </label>
                    <div className="scrollbar-none flex overflow-x-auto rounded-full border border-line p-1 text-sm" role="group" aria-label="Stock filter">
                        {FILTERS.map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={(filters.stock ?? '') === value}
                                onClick={() => router.get(route('admin.products.index'), { ...filters, stock: value || undefined }, { preserveState: true })}
                                className={cn('shrink-0 rounded-full px-3.5 py-1.5', (filters.stock ?? '') === value ? 'bg-ink text-paper' : 'text-ink-mute hover:text-ink')}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <ul className="divide-y divide-line">
                    {products.data.map((p) => (
                        <ProductRow key={p.id} p={p} />
                    ))}
                </ul>
                {!products.data.length && <p className="py-12 text-center text-sm text-ink-mute">No products match.</p>}
                <Pager paginator={products} />
            </Panel>
        </AdminLayout>
    );
}

Products.layout = (page) => page;

function ProductRow({ p }) {
    const form = useForm({ stock: p.stock, price: p.price, sale_price: p.sale_price ?? '' });
    const dirty = form.isDirty;
    const save = (e) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, sale_price: d.sale_price === '' ? null : d.sale_price }));
        form.patch(route('admin.products.update', p.id), { preserveScroll: true, onSuccess: () => form.setDefaults() });
    };
    const input = 'h-10 w-24 rounded-xl border border-line-strong bg-paper px-3 font-mono text-sm focus:border-ink focus:outline-none';

    return (
        <li>
            <form onSubmit={save} className="flex flex-wrap items-center gap-4 py-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-plate">
                    {p.thumb ? <img src={p.thumb} alt="" loading="lazy" className="size-[80%] object-contain mix-blend-multiply" /> : <Icon name="cube" size={16} className="text-ink-mute" />}
                </span>
                <span className="min-w-0 flex-1 basis-56">
                    <span className="line-clamp-1 text-sm">{p.name}</span>
                    <span className="text-xs text-ink-mute">
                        {p.brand} · {p.category}
                    </span>
                </span>
                <span className="flex gap-1.5">
                    {!p.listed && <StatusPill>Hidden</StatusPill>}
                    {p.stock === 0 ? <StatusPill tone="bad">Sold out</StatusPill> : p.stock <= 5 ? <StatusPill tone="warn">Low</StatusPill> : null}
                </span>
                <label className="text-xs text-ink-mute">
                    Stock
                    <input type="number" min="0" className={cn(input, 'mt-1 block')} value={form.data.stock} onChange={(e) => form.setData('stock', e.target.value)} />
                </label>
                <label className="text-xs text-ink-mute">
                    Price
                    <input type="number" min="1" step="0.01" className={cn(input, 'mt-1 block')} value={form.data.price} onChange={(e) => form.setData('price', e.target.value)} />
                </label>
                <label className="text-xs text-ink-mute">
                    Sale
                    <input type="number" min="1" step="0.01" className={cn(input, 'mt-1 block')} value={form.data.sale_price} onChange={(e) => form.setData('sale_price', e.target.value)} placeholder="—" />
                </label>
                <button type="submit" disabled={!dirty || form.processing} className="mt-4 rounded-full bg-ink px-4 py-2 text-xs text-paper transition-opacity disabled:opacity-30">
                    Save
                </button>
                {Object.values(form.errors)[0] && <p className="basis-full text-xs text-coral">{Object.values(form.errors)[0]}</p>}
            </form>
        </li>
    );
}
