import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import Select from '@/Components/ui/Select';
import AdminLayout, { PageGuide, Pager, Panel } from '@/Layouts/AdminLayout';
import { date, money } from '@/lib/format';
import { OrderStatus } from './Dashboard';

export default function Orders({ orders, filters, statuses }) {
    const [q, setQ] = useState(filters.q ?? '');

    // Debounced search keeps the URL (and back button) in sync.
    useEffect(() => {
        if (q === (filters.q ?? '')) return undefined;
        const t = setTimeout(() => router.get(route('admin.orders.index'), { ...filters, q: q || undefined }, { preserveState: true, replace: true }), 350);
        return () => clearTimeout(t);
    }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AdminLayout title="Orders">
            <PageGuide
                id="orders"
                steps={[
                    "Every order is listed here, newest first. “Rx” means it contains prescription medicine.",
                    "Search by order number, customer name or email, or use “Status” to see only one kind (for example “Order placed” = not confirmed yet).",
                    "Press “Open” to see the items and the customer’s address, and to change the order’s status.",
                    "Cancelling an order automatically puts its items back in stock.",
                ]}
            />
            <Panel>
                <div className="mb-6 flex flex-wrap items-center gap-3">
                    <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-line-strong bg-paper px-4 sm:max-w-sm">
                        <Icon name="search" size={16} className="text-ink-mute" />
                        <span className="sr-only">Search orders</span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number, name or email" className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
                    </label>
                    <Select
                        variant="pill"
                        prefix="Status"
                        ariaLabel="Filter by status"
                        value={filters.status ?? ''}
                        options={[{ value: '', label: 'All' }, ...statuses]}
                        onChange={(status) => router.get(route('admin.orders.index'), { ...filters, status: status || undefined }, { preserveState: true })}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[52rem] text-left text-sm">
                        <thead>
                            <tr className="text-ink-mute">
                                {['Order', 'Placed', 'Customer', 'City', 'Items', 'Total', 'Status', ''].map((h) => (
                                    <th key={h} scope="col" className="pb-3 font-mono text-[0.65rem] font-normal uppercase tracking-wider">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {orders.data.map((o) => (
                                <tr key={o.number} className="transition-colors hover:bg-paper-deep/40">
                                    <td className="py-3 font-mono text-xs">
                                        {o.number} {o.rx && <span className="ml-1 rounded bg-ink px-1 text-[0.6rem] text-paper">Rx</span>}
                                    </td>
                                    <td className="text-ink-mute">{date(o.placed_at)}</td>
                                    <td>
                                        <p>{o.customer}</p>
                                        <p className="text-xs text-ink-mute">{o.email}</p>
                                    </td>
                                    <td className="text-ink-mute">{o.city}</td>
                                    <td>{o.items_count}</td>
                                    <td className="font-mono text-xs">{money(o.total)}</td>
                                    <td>
                                        <OrderStatus status={o.status} label={o.status_label} />
                                    </td>
                                    <td className="text-right">
                                        <Link href={route('admin.orders.show', o.number)} className="inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline">
                                            Open <Icon name="arrow" size={12} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!orders.data.length && <p className="py-12 text-center text-sm text-ink-mute">No orders match.</p>}
                </div>
                <Pager paginator={orders} />
            </Panel>
        </AdminLayout>
    );
}

Orders.layout = (page) => page;
