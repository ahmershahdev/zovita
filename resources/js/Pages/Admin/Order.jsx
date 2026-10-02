import { Link, router } from '@inertiajs/react';
import Icon from '@/Components/ui/Icon';
import Select from '@/Components/ui/Select';
import AdminLayout, { Panel } from '@/Layouts/AdminLayout';
import { money } from '@/lib/format';
import { OrderStatus } from './Dashboard';

export default function Order({ order, statuses }) {
    const setStatus = (status) => {
        if (status === 'cancelled' && !window.confirm('Cancel this order and return its items to stock?')) return;
        router.patch(route('admin.orders.update', order.number), { status }, { preserveScroll: true });
    };

    return (
        <AdminLayout
            title={order.number}
            actions={
                <div className="flex items-center gap-3">
                    <OrderStatus status={order.status} label={order.status_label} />
                    <Select variant="pill" prefix="Set status" ariaLabel="Change order status" value={order.status} options={statuses} onChange={setStatus} />
                </div>
            }
        >
            <Link href={route('admin.orders.index')} className="mb-6 inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink">
                <Icon name="arrowLeft" size={14} /> All orders
            </Link>
            <div className="grid gap-6 lg:grid-cols-3">
                <Panel title="Items" className="lg:col-span-2">
                    <ul className="divide-y divide-line">
                        {order.items.map((item) => (
                            <li key={item.slug} className="flex items-center gap-4 py-3">
                                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-plate">
                                    {item.image && <img src={item.image} alt="" className="size-[80%] object-contain mix-blend-multiply" loading="lazy" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <Link href={route('products.show', item.slug)} className="line-clamp-1 hover:underline">
                                        {item.name}
                                    </Link>
                                    <span className="text-xs text-ink-mute">
                                        {item.quantity} × {money(item.unit_price, { precise: true })}
                                    </span>
                                </span>
                                <span className="font-mono text-sm">{money(item.line_total, { precise: true })}</span>
                            </li>
                        ))}
                    </ul>
                    <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                        {[
                            ['Subtotal', order.subtotal],
                            ['Discount', -order.savings],
                            ['Personal offers', -order.offer_discount],
                            ['Delivery', order.delivery_fee],
                        ]
                            .filter(([, v]) => v)
                            .map(([k, v]) => (
                                <div key={k} className="flex justify-between">
                                    <dt className="text-ink-mute">{k}</dt>
                                    <dd className="font-mono">{v < 0 ? `− ${money(-v, { precise: true })}` : money(v, { precise: true })}</dd>
                                </div>
                            ))}
                        <div className="flex justify-between border-t border-line pt-3">
                            <dt className="font-medium">Total (cash on delivery)</dt>
                            <dd className="font-display text-3xl">{money(order.total, { precise: true })}</dd>
                        </div>
                    </dl>
                </Panel>

                <div className="space-y-6">
                    <Panel title="Customer">
                        <dl className="space-y-3 text-sm">
                            {[
                                ['Name', order.customer_name],
                                ['Email', order.email],
                                ['Phone', order.phone],
                                ['Address', `${order.address}, ${order.city}`],
                                ['Placed', new Date(order.placed_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })],
                                ['Account', order.account ? `${order.account.name} (#${order.account.id})` : 'Guest checkout'],
                            ].map(([k, v]) => (
                                <div key={k}>
                                    <dt className="text-xs text-ink-mute">{k}</dt>
                                    <dd className="break-words">{v}</dd>
                                </div>
                            ))}
                            {order.notes && (
                                <div>
                                    <dt className="text-xs text-ink-mute">Notes</dt>
                                    <dd className="whitespace-pre-line">{order.notes}</dd>
                                </div>
                            )}
                        </dl>
                    </Panel>
                    {order.prescription && (
                        <Panel title="Prescription">
                            <p className="text-sm">
                                {order.prescription.reference} · {order.prescription.status}
                            </p>
                            <Link href={route('admin.prescriptions.index', { status: 'all' })} className="mt-3 inline-flex items-center gap-1 text-sm underline underline-offset-4">
                                Review prescriptions <Icon name="arrow" size={12} />
                            </Link>
                        </Panel>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

Order.layout = (page) => page;
