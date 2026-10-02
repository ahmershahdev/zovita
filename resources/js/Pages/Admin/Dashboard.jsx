import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { AreaChart, BarList, DataTable, PairedBars, Sparkline, fmt } from '@/Components/admin/Charts';
import Icon from '@/Components/ui/Icon';
import AdminLayout, { PageGuide, Panel, StatusPill } from '@/Layouts/AdminLayout';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';

export default function Dashboard({ days, ranges, kpis, series, topProducts, byDepartment, statuses, funnel, offers, experiments, attention, recentOrders, customers, catalog }) {
    const [metric, setMetric] = useState('revenue');
    const [table, setTable] = useState(false);

    return (
        <AdminLayout
            title="Today at Zovita"
            actions={
                <div className="flex rounded-full border border-line p-1 text-sm" role="group" aria-label="Date range">
                    {ranges.map((r) => (
                        <button
                            key={r}
                            type="button"
                            onClick={() => router.get(route('admin.dashboard'), { days: r }, { preserveScroll: true, preserveState: true })}
                            aria-pressed={days === r}
                            className={cn('rounded-full px-4 py-1.5 transition-colors', days === r ? 'bg-ink text-paper' : 'text-ink-mute hover:text-ink')}
                        >
                            {r} days
                        </button>
                    ))}
                </div>
            }
        >
            <PageGuide
                id="dashboard"
                steps={[
                    "Start with the coloured boxes at the top: they are today’s to-do list. Click one to go straight to it.",
                    "The numbers below compare the chosen period with the one before (▲ better, ▼ worse). Change the period with the buttons at the top right.",
                    "Hover any chart to see exact numbers, or press “Table” to see them as a list.",
                    "Press the ? next to any heading for a plain explanation of what it means.",
                ]}
            />

            {/* Needs attention */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Attention href={route('admin.prescriptions.index')} icon="rx" value={attention.prescriptions} label="Prescriptions to review" tone={attention.prescriptions ? 'warn' : 'good'} />
                <Attention href={route('admin.orders.index', { status: 'pending' })} icon="package" value={attention.pendingOrders} label="Orders awaiting confirmation" tone={attention.pendingOrders ? 'warn' : 'good'} />
                <Attention href={route('admin.products.index', { stock: 'low' })} icon="alert" value={attention.lowStock} label="Products low on stock (≤ 5)" tone={attention.lowStock ? 'warn' : 'good'} />
                <Attention href={route('admin.products.index', { stock: 'out' })} icon="close" value={attention.soldOut} label="Products sold out" tone={attention.soldOut ? 'bad' : 'good'} />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((k, i) => {
                    const delta = k.previous ? ((k.value - k.previous) / k.previous) * 100 : null;
                    const key = i === 1 ? 'orders' : 'revenue';
                    return (
                        <div key={k.label} className="rounded-4xl border border-line bg-card p-5">
                            <p className="text-sm text-ink-mute">{k.label}</p>
                            <p className="mt-2 font-display text-4xl leading-none">{fmt(k.value, k.format)}</p>
                            <p className={cn('mt-2 text-xs', delta === null ? 'text-ink-mute' : delta >= 0 ? 'text-teal' : 'text-coral')}>
                                {delta === null ? 'No previous data' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}% vs previous ${days} days`}
                            </p>
                            {i < 3 && <Sparkline values={series.map((s) => s[key])} className="mt-4" />}
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Panel
                    className="xl:col-span-2"
                    title={metric === 'revenue' ? 'Revenue per day' : 'Orders per day'}
                    description={`Last ${days} days, cancelled orders excluded`}
                    help="How much money came in each day (or how many orders), counting only orders that were not cancelled. Hover the line to see a specific day."
                    aside={
                        <div className="flex items-center gap-2">
                            <div className="flex rounded-full border border-line p-0.5 text-xs" role="group" aria-label="Metric">
                                {['revenue', 'orders'].map((m) => (
                                    <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)} className={cn('rounded-full px-3 py-1 capitalize', metric === m ? 'bg-ink text-paper' : 'text-ink-mute')}>
                                        {m}
                                    </button>
                                ))}
                            </div>
                            <button type="button" onClick={() => setTable((t) => !t)} className="rounded-full border border-line px-3 py-1 text-xs text-ink-mute hover:text-ink" aria-pressed={table}>
                                {table ? 'Chart' : 'Table'}
                            </button>
                        </div>
                    }
                >
                    {table ? (
                        <DataTable columns={[{ key: 'date', label: 'Date' }, { key: 'orders', label: 'Orders', format: 'number' }, { key: 'revenue', label: 'Revenue', format: 'money' }]} rows={series} />
                    ) : (
                        <AreaChart data={series} valueKey={metric} format={metric === 'revenue' ? 'money' : 'number'} label={metric === 'revenue' ? 'Revenue per day' : 'Orders per day'} />
                    )}
                </Panel>

                <Panel title="Shopper funnel" description="Unique visitors, from personalisation signals" help="How many people looked at a product, spent real time on it (20+ seconds), added it to their bag, and finally bought. The % shows how many of the first group made it to each step — bigger is better.">
                    <BarList items={funnel} ordinal empty="No browsing data in this range yet." />
                    <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-5 text-sm">
                        <div>
                            <dt className="text-ink-mute">Customers</dt>
                            <dd className="font-display text-2xl">{fmt(customers.total)}</dd>
                        </div>
                        <div>
                            <dt className="text-ink-mute">Active 24h</dt>
                            <dd className="font-display text-2xl">{fmt(customers.active24h)}</dd>
                        </div>
                    </dl>
                </Panel>

                <Panel title="Top products" description="By revenue" help="The products that brought in the most money in this period. Hover a bar to see how many units sold. Keep these in stock.">
                    <BarList items={topProducts.map((p) => ({ ...p, hint: `${p.units} units` }))} format="money" empty="No sales in this range yet." />
                </Panel>

                <Panel title="Sales by department" description="By revenue" help="Which parts of the shop sell the most (medicines, vitamins, skin care…).">
                    <BarList items={byDepartment} format="money" empty="No sales in this range yet." />
                </Panel>

                <Panel title="Order status" description={`Orders placed in the last ${days} days`} help="Where recent orders are right now. “Order placed” means nobody has confirmed it yet — those need attention.">
                    <BarList items={statuses} empty="No orders in this range yet." />
                </Panel>

                <Panel title="Personal offers" description={`${money(offers.total)} discounted automatically`} className="xl:col-span-1" help="The shop gives small automatic discounts to customers (for example on a product they keep looking at, or to loyal customers). This shows how many were given and how many were used. You don’t need to do anything here.">
                    {offers.byKind.length ? (
                        <BarList items={offers.byKind.map((o) => ({ label: o.label, value: o.issued, hint: `${o.redeemed} redeemed (${o.issued ? Math.round((o.redeemed / o.issued) * 100) : 0}%)` }))} />
                    ) : (
                        <p className="py-8 text-center text-sm text-ink-mute">No offers issued in this range yet.</p>
                    )}
                </Panel>

                <Panel title="A/B experiments" description="Unique visitors per variant" className="xl:col-span-2" help="We show two versions of some parts of the site to different visitors to see which works better. The longer bar under “Conversion” is the version that sells more. Tell your developer which one wins once each side has a few hundred visitors.">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                        {experiments.map((exp) => (
                            <div key={exp.name}>
                                <p className="font-mono text-xs uppercase tracking-wider text-ink-mute">{exp.name}</p>
                                <p className="mb-4 mt-1 text-sm text-ink-soft">{exp.description}</p>
                                <PairedBars
                                    variants={exp.variants.map((v) => v.variant)}
                                    metrics={[
                                        { label: 'Exposed', values: exp.variants.map((v) => v.exposure) },
                                        { label: 'Click-through', values: exp.variants.map((v) => v.ctr), suffix: '%' },
                                        { label: 'Added to bag', values: exp.variants.map((v) => v.add_to_cart) },
                                        { label: 'Conversion', values: exp.variants.map((v) => v.conversion), suffix: '%' },
                                    ]}
                                />
                            </div>
                        ))}
                    </div>
                </Panel>

                <Panel title="Recent orders" className="xl:col-span-3" help="The newest orders. Click an order number to open it." aside={<Link href={route('admin.orders.index')} className="text-sm underline underline-offset-4">All orders</Link>}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[40rem] text-left text-sm">
                            <thead>
                                <tr className="text-ink-mute">
                                    {['Order', 'Customer', 'City', 'Items', 'Total', 'Status'].map((h) => (
                                        <th key={h} scope="col" className="pb-3 font-mono text-[0.65rem] font-normal uppercase tracking-wider">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {recentOrders.map((o) => (
                                    <tr key={o.number}>
                                        <td className="py-3">
                                            <Link href={route('admin.orders.show', o.number)} className="font-mono text-xs underline-offset-4 hover:underline">
                                                {o.number}
                                            </Link>
                                        </td>
                                        <td>{o.customer}</td>
                                        <td className="text-ink-mute">{o.city}</td>
                                        <td>{o.items_count}</td>
                                        <td className="font-mono text-xs">{money(o.total)}</td>
                                        <td>
                                            <OrderStatus status={o.status} label={o.status_label} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-5 text-xs text-ink-mute">
                        Catalog: {fmt(catalog.products)} listed products · stock value {money(catalog.stockValue)} · {fmt(customers.banned)} banned accounts
                    </p>
                </Panel>
            </div>
        </AdminLayout>
    );
}

Dashboard.layout = (page) => page;

function Attention({ href, icon, value, label, tone }) {
    return (
        <Link href={href} className="group flex items-center gap-4 rounded-4xl border border-line bg-card p-5 transition-colors hover:border-ink">
            <span className={cn('grid size-11 place-items-center rounded-full', tone === 'good' ? 'bg-mint-soft text-teal' : tone === 'bad' ? 'bg-coral/10 text-coral' : 'bg-[#fdf1d8] text-[#8a5a00] dark:bg-[#3a2c0d] dark:text-[#f2c66d]')}>
                <Icon name={icon} size={18} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block font-display text-3xl leading-none">{value}</span>
                <span className="mt-1 block text-xs text-ink-mute">{label}</span>
            </span>
            <Icon name="arrow" size={15} className="text-ink-mute transition-transform group-hover:translate-x-1" />
        </Link>
    );
}

export function OrderStatus({ status, label }) {
    const tone = { delivered: 'good', confirmed: 'good', shipped: 'good', packed: 'neutral', pending: 'warn', cancelled: 'bad' }[status] ?? 'neutral';
    return <StatusPill tone={tone}>{label}</StatusPill>;
}
