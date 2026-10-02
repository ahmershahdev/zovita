import { Head, Link, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Overlay from '@/Components/layout/Overlay';
import ProductCard from '@/Components/product/ProductCard';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';
import Button from '@/Components/ui/Button';
import EmptyState from '@/Components/ui/EmptyState';
import Icon from '@/Components/ui/Icon';
import Select from '@/Components/ui/Select';
import Pagination from '@/Components/ui/Pagination';
import useReveal from '@/hooks/useReveal';
import { cn } from '@/lib/cn';
import { shopUrl } from '@/lib/shopUrl';

export default function ShopIndex({ department, departments, products, filters, facets, canonical }) {
    const scope = useRef(null);
    const [drawer, setDrawer] = useState(false);
    const [q, setQ] = useState(filters.q);
    useReveal(scope, [department?.slug]);

    useEffect(() => setQ(filters.q), [filters.q]);

    /** Apply a filter change as a clean URL (no query string); resets pagination, keeps scroll + state. */
    const apply = useCallback(
        (changes) => {
            const next = { ...filters, ...changes, department: department?.slug, page: 1 };
            router.get(shopUrl(next), {}, { preserveState: true, preserveScroll: true, replace: true, only: ['products', 'filters', 'facets', 'canonical'] });
        },
        [filters, department],
    );

    const active = [
        filters.q && { key: 'q', label: `“${filters.q}”` },
        filters.category && { key: 'category', label: facets.categories.find((c) => c.slug === filters.category)?.name ?? filters.category },
        filters.brand && { key: 'brand', label: facets.brands.find((b) => b.slug === filters.brand)?.name ?? filters.brand },
        filters.form && { key: 'form', label: filters.form },
        filters.rx && { key: 'rx', label: filters.rx === 'rx' ? 'Prescription only' : 'Over the counter' },
        filters.in_stock && { key: 'in_stock', label: 'In stock' },
        (filters.min !== null || filters.max !== null) && { key: 'price', label: `PKR ${filters.min ?? 0} – ${filters.max ?? '∞'}` },
    ].filter(Boolean);

    const clearOne = (key) => apply(key === 'price' ? { min: null, max: null } : { [key]: key === 'in_stock' ? false : '' });

    const title = department?.name ?? (filters.q ? `Results for “${filters.q}”` : 'The pharmacy');

    const panel = <FilterPanel filters={filters} facets={facets} apply={apply} />;

    return (
        <div ref={scope}>
            <Head title={department?.name ?? 'Shop all products'}>
                <meta head-key="description" name="description" content={department?.blurb ?? 'Shop authentic medicines, syrups, supplements and healthcare essentials online.'} />
                {canonical && <link head-key="canonical" rel="canonical" href={canonical} />}
            </Head>

            <section className="container-x pb-10 pt-10 md:pt-16">
                <Breadcrumbs
                    schema={false}
                    items={[
                        { label: 'Shop', href: department || filters.category ? route('shop.index') : null },
                        department && { label: department.name, href: filters.category ? shopUrl({ department: department.slug }) : null },
                        filters.category && { label: facets.categories.find((c) => c.slug === filters.category)?.name ?? filters.category },
                    ]}
                />
                <div className="mt-8 grid gap-8 md:grid-cols-12 md:items-end">
                    <h1 className="font-display text-title md:col-span-8" data-split="now" key={title}>
                        {title}
                    </h1>
                    <p className="text-ink-mute md:col-span-4 md:text-right" data-reveal>
                        {department?.blurb ?? 'Authentic stock, pharmacist-verified orders and cash on delivery nationwide.'}
                    </p>
                </div>

                {/* Department tabs */}
                <nav className="scrollbar-none -mx-[clamp(1rem,3.2vw,3rem)] mt-10 flex gap-2 overflow-x-auto px-[clamp(1rem,3.2vw,3rem)]" aria-label="Departments">
                    <Link
                        href={route('shop.index')}
                        className={cn('shrink-0 rounded-full border px-5 py-2.5 text-sm transition', !department ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink')}
                    >
                        All
                    </Link>
                    {departments.map((d) => (
                        <Link
                            key={d.slug}
                            href={route('shop.department', d.slug)}
                            className={cn(
                                'shrink-0 rounded-full border px-5 py-2.5 text-sm transition',
                                department?.slug === d.slug ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink',
                            )}
                        >
                            {d.name} <span className="ml-1 font-mono text-xs opacity-80">{d.count}</span>
                        </Link>
                    ))}
                </nav>
            </section>

            <section className="container-x grid gap-10 lg:grid-cols-12">
                <aside className="hidden lg:col-span-3 lg:block">
                    <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-4" data-lenis-prevent>
                        {panel}
                    </div>
                </aside>

                <div className="min-w-0 lg:col-span-9">
                    {/* Toolbar */}
                    <div className="sticky top-20 z-30 -mx-2 mb-6 rounded-3xl flex flex-wrap items-center gap-3 bg-paper/90 px-2 py-3 backdrop-blur lg:static lg:bg-transparent lg:backdrop-blur-none">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                apply({ q });
                            }}
                            className="flex h-11 min-w-0 flex-1 basis-full items-center gap-2 rounded-full border border-line-strong bg-card px-4 focus-within:border-ink sm:basis-auto"
                        >
                            <Icon name="search" size={18} className="text-ink-mute" />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search within results" className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" aria-label="Search products" />
                        </form>
                        <button type="button" onClick={() => setDrawer(true)} className="flex h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm lg:hidden">
                            <Icon name="filter" size={18} /> Filters {active.length > 0 && <span className="grid size-5 place-items-center rounded-full bg-ink font-mono text-[0.65rem] text-paper">{active.length}</span>}
                        </button>
                        <Select variant="pill" prefix="Sort" ariaLabel="Sort products" value={filters.sort} onChange={(sort) => apply({ sort })} options={facets.sorts} />
                    </div>

                    <div className="mb-8 flex flex-wrap items-center gap-2">
                        <p className="mr-2 font-mono text-sm text-ink-mute">
                            {products.total} {products.total === 1 ? 'product' : 'products'}
                        </p>
                        {active.map((chip) => (
                            <button key={chip.key} type="button" onClick={() => clearOne(chip.key)} className="flex items-center gap-1.5 rounded-full bg-ink py-1.5 pl-3.5 pr-2.5 text-xs capitalize text-paper transition hover:bg-coral">
                                {chip.label} <Icon name="close" size={14} />
                            </button>
                        ))}
                        {active.length > 1 && (
                            <Link href={shopUrl({ department: department?.slug })} preserveScroll className="text-xs underline underline-offset-4">
                                Clear all
                            </Link>
                        )}
                    </div>

                    {products.data.length ? (
                        <>
                            <h2 className="sr-only">Products</h2>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6">
                                {products.data.map((p, i) => (
                                    <ProductCard key={p.id} product={p} priority={i < 6} />
                                ))}
                            </div>
                            <div className="mt-16">
                                <Pagination meta={products} />
                            </div>
                        </>
                    ) : (
                        <EmptyState
                            icon="search"
                            title="Nothing matches — yet."
                            body="Try removing a filter or searching by the salt name (e.g. paracetamol) instead of the brand."
                            action={<Button href={shopUrl({ department: department?.slug })}>Reset filters</Button>}
                        />
                    )}
                </div>
            </section>

            <Overlay open={drawer} onClose={() => setDrawer(false)} side="right" label="Filters">
                <div className="flex h-18 items-center justify-between border-b border-line px-5">
                    <span className="font-display text-3xl">Filters</span>
                    <button type="button" onClick={() => setDrawer(false)} className="grid size-11 place-items-center rounded-full border border-line-strong" aria-label="Close filters">
                        <Icon name="close" />
                    </button>
                </div>
                <div className="p-5">{panel}</div>
                <div className="sticky bottom-0 border-t border-line bg-paper p-5">
                    <Button className="w-full" onClick={() => setDrawer(false)}>
                        Show {products.total} products
                    </Button>
                </div>
            </Overlay>
        </div>
    );
}

function FilterGroup({ title, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-line py-5">
            <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left" aria-expanded={open}>
                <span className="eyebrow">{title}</span>
                <Icon name={open ? 'minus' : 'plus'} size={16} />
            </button>
            {open && <div className="mt-4">{children}</div>}
        </div>
    );
}

function Option({ active, onClick, label, count }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition', active ? 'bg-ink text-paper' : 'hover:bg-paper-deep')}
        >
            <span className="truncate capitalize">{label}</span>
            <span className="ml-2 font-mono text-xs opacity-80">{count}</span>
        </button>
    );
}

function FilterPanel({ filters, facets, apply }) {
    const [price, setPrice] = useState({ min: filters.min ?? '', max: filters.max ?? '' });
    const [showAllBrands, setShowAllBrands] = useState(false);

    useEffect(() => setPrice({ min: filters.min ?? '', max: filters.max ?? '' }), [filters.min, filters.max]);

    const brands = showAllBrands ? facets.brands : facets.brands.slice(0, 8);

    return (
        <div>
            <FilterGroup title="Category">
                <div className="space-y-0.5">
                    {facets.categories.map((c) => (
                        <Option key={c.slug} label={c.name} count={c.count} active={filters.category === c.slug} onClick={() => apply({ category: filters.category === c.slug ? '' : c.slug })} />
                    ))}
                </div>
            </FilterGroup>

            <FilterGroup title="Availability">
                <div className="space-y-0.5">
                    <Option label="In stock only" active={filters.in_stock} onClick={() => apply({ in_stock: !filters.in_stock })} />
                    <Option label="Over the counter" active={filters.rx === 'otc'} onClick={() => apply({ rx: filters.rx === 'otc' ? '' : 'otc' })} />
                    <Option label="Prescription required" active={filters.rx === 'rx'} onClick={() => apply({ rx: filters.rx === 'rx' ? '' : 'rx' })} />
                </div>
            </FilterGroup>

            <FilterGroup title="Price (PKR)">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply({ min: price.min === '' ? null : Number(price.min), max: price.max === '' ? null : Number(price.max) });
                    }}
                    className="flex items-center gap-2"
                >
                    <input type="number" min="0" inputMode="numeric" placeholder="Min" value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value })} className="h-10 w-full rounded-xl border border-line-strong bg-card px-3 text-sm focus:border-ink focus:outline-none" aria-label="Minimum price" />
                    <span className="text-ink-mute">–</span>
                    <input type="number" min="0" inputMode="numeric" placeholder="Max" value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value })} className="h-10 w-full rounded-xl border border-line-strong bg-card px-3 text-sm focus:border-ink focus:outline-none" aria-label="Maximum price" />
                    <button className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-paper" aria-label="Apply price">
                        <Icon name="arrow" size={16} />
                    </button>
                </form>
            </FilterGroup>

            <FilterGroup title="Form">
                <div className="flex flex-wrap gap-1.5">
                    {facets.forms.map((f) => (
                        <button
                            key={f.slug}
                            type="button"
                            onClick={() => apply({ form: filters.form === f.slug ? '' : f.slug })}
                            className={cn('rounded-full border px-3 py-1.5 text-xs capitalize transition', filters.form === f.slug ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink')}
                        >
                            {f.name} <span className="opacity-50">{f.count}</span>
                        </button>
                    ))}
                </div>
            </FilterGroup>

            <FilterGroup title="Brand" defaultOpen={false}>
                <div className="space-y-0.5">
                    {brands.map((b) => (
                        <Option key={b.slug} label={b.name.toLowerCase()} count={b.count} active={filters.brand === b.slug} onClick={() => apply({ brand: filters.brand === b.slug ? '' : b.slug })} />
                    ))}
                </div>
                {facets.brands.length > 8 && (
                    <button type="button" onClick={() => setShowAllBrands(!showAllBrands)} className="mt-3 text-xs underline underline-offset-4">
                        {showAllBrands ? 'Show fewer' : `Show all ${facets.brands.length}`}
                    </button>
                )}
            </FilterGroup>
        </div>
    );
}
