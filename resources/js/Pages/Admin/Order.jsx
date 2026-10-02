import { Link, router, useForm } from '@inertiajs/react';
import InteractionWarnings from '@/Components/product/InteractionWarnings';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import Select from '@/Components/ui/Select';
import AdminLayout, { Panel, StatusPill } from '@/Layouts/AdminLayout';
import { money } from '@/lib/format';
import { OrderStatus } from './Dashboard';

export default function Order({ order, statuses }) {
    const paidByCard = order.payment_method === 'card' && ['paid', 'partially_refunded'].includes(order.payment_status);
    const setStatus = (status) => {
        const question = paidByCard ? 'Cancel this order, return its items to stock and refund the card?' : 'Cancel this order and return its items to stock?';
        if (status === 'cancelled' && !window.confirm(question)) return;
        router.patch(route('admin.orders.update', order.number), { status }, { preserveScroll: true });
    };

    return (
        <AdminLayout
            title={order.number}
            actions={
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <OrderStatus status={order.status} label={order.status_label} />
                    <Select variant="pill" prefix="Set status" ariaLabel="Change order status" value={order.status} options={statuses} onChange={setStatus} />
                </div>
            }
        >
            <Link href={route('admin.orders.index')} className="mb-6 inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink">
                <Icon name="arrowLeft" size={14} /> All orders
            </Link>
            {order.interaction_warnings?.length > 0 && <InteractionWarnings warnings={order.interaction_warnings} className="mb-6" />}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                            <dt className="font-medium">Total ({order.payment_method === 'card' ? 'card' : 'cash on delivery'})</dt>
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
                    <PaymentPanel order={order} />
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

function PaymentPanel({ order }) {
    const payment = order.payment;
    const form = useForm({ amount: payment?.refundable ?? '', reason: '' });
    const tone = { paid: 'good', refunded: 'neutral', partially_refunded: 'warn', pending: 'warn', expired: 'bad', failed: 'bad' }[order.payment_status] ?? 'neutral';

    const refund = (e) => {
        e.preventDefault();
        if (!window.confirm(`Refund ${money(form.data.amount, { precise: true })} to the customer's card? This can't be undone.`)) return;
        form.post(route('admin.orders.refund', order.number), { preserveScroll: true, onSuccess: () => form.reset('reason') });
    };

    return (
        <Panel title="Payment" help="Card payments are confirmed by the payment provider, never by the customer's browser. A refund goes back to the same card; you can refund part of an order (for example one item that was out of stock).">
            <p className="flex flex-wrap items-center gap-2 text-sm">
                <StatusPill tone={order.payment_method === 'card' ? tone : 'neutral'}>{order.payment_status_label}</StatusPill>
                {order.refunded_amount > 0 && <span className="text-ink-mute">Refunded {money(order.refunded_amount, { precise: true })}</span>}
            </p>
            {payment && (
                <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-ink-mute">Captured</dt><dd className="font-mono">{money(payment.amount, { precise: true })}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-mute">Provider</dt><dd className="capitalize">{payment.provider}</dd></div>
                    {payment.refunds.map((r, i) => (
                        <div key={i} className="rounded-2xl bg-paper-deep p-3 text-xs">
                            <p className="font-mono">− {money(r.amount, { precise: true })}</p>
                            <p className="text-ink-mute">{[r.reason, r.by, new Date(r.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })].filter(Boolean).join(' · ')}</p>
                        </div>
                    ))}
                </dl>
            )}
            {payment && payment.refundable > 0 && order.can_refund && (
                <form onSubmit={refund} className="mt-5 space-y-3 border-t border-line pt-5" noValidate>
                    <Field label="Refund amount (PKR)" type="number" min="1" step="0.01" max={payment.refundable} value={form.data.amount} onChange={(e) => form.setData('amount', e.target.value)} error={form.errors.amount} hint={`Up to ${money(payment.refundable, { precise: true })}`} />
                    <Field label="Reason" optional value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} placeholder="e.g. Item out of stock" />
                    <Button type="submit" variant="danger" size="sm" loading={form.processing}>
                        Refund to card
                    </Button>
                </form>
            )}
            {payment && payment.refundable > 0 && !order.can_refund && <p className="mt-4 text-xs text-ink-mute">Only the owner can issue refunds.</p>}
        </Panel>
    );
}
