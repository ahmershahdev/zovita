import { Link } from '@inertiajs/react';
import { cn } from '@/lib/cn';
import { date, money } from '@/lib/format';

/** Status timeline + items + totals for a single order (tracking, account, confirmation). */
export default function OrderDetail({ order, hideTimeline = false }) {
    const cancelled = order.status === 'cancelled';

    return (
        <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
                <div className={cn('rounded-4xl bg-card p-6 md:p-8', hideTimeline && 'hidden')}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-mono text-sm">{order.number}</p>
                        <p className="text-sm text-ink-mute">Placed {date(order.placed_at)}</p>
                    </div>
                    {cancelled ? (
                        <p className="mt-6 rounded-2xl bg-coral/10 p-4 text-coral">This order was cancelled.</p>
                    ) : (
                        <ol className="mt-8 grid gap-4 sm:grid-cols-5">
                            {order.timeline.map((step, i) => (
                                <li key={step.key} className="flex items-center gap-3 sm:flex-col sm:items-start">
                                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs', step.done ? 'bg-ink text-paper' : 'border border-line-strong text-ink-mute')}>
                                        {i + 1}
                                    </span>
                                    <span className={cn('text-sm', !step.done && 'text-ink-mute')}>{step.label}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                <ul className="mt-6 divide-y divide-line border-y border-line">
                    {order.items.map((item) => (
                        <li key={item.slug} className="flex items-center gap-4 py-4">
                            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-card">
                                {item.image && <img src={item.image} alt="" className="size-12 object-contain mix-blend-multiply" />}
                            </span>
                            <Link href={route('products.show', item.slug)} className="min-w-0 flex-1 text-sm hover:underline">
                                {item.name}
                                <span className="block text-ink-mute">
                                    {item.quantity} × {money(item.unit_price, { precise: true })}
                                </span>
                            </Link>
                            <span className="text-sm font-medium">{money(item.line_total, { precise: true })}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="space-y-6 lg:col-span-5">
                <dl className="space-y-3 rounded-4xl border border-line p-6 text-sm md:p-8">
                    <div className="flex justify-between">
                        <dt className="text-ink-mute">Subtotal</dt>
                        <dd>{money(order.subtotal, { precise: true })}</dd>
                    </div>
                    {order.savings > 0 && (
                        <div className="flex justify-between text-teal">
                            <dt>Discount</dt>
                            <dd>− {money(order.savings, { precise: true })}</dd>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <dt className="text-ink-mute">Delivery</dt>
                        <dd>{order.delivery_fee > 0 ? money(order.delivery_fee) : 'Free'}</dd>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-line pt-4">
                        <dt className="font-medium">Total · cash on delivery</dt>
                        <dd className="font-display text-3xl">{money(order.total, { precise: true })}</dd>
                    </div>
                </dl>
                <div className="rounded-4xl border border-line p-6 text-sm md:p-8">
                    <p className="eyebrow text-ink-mute">Delivering to</p>
                    <p className="mt-3 font-medium">{order.customer_name}</p>
                    <p className="mt-1 text-ink-soft">
                        {order.address}, {order.city}
                    </p>
                    <p className="mt-1 text-ink-soft">{order.phone}</p>
                </div>
            </div>
        </div>
    );
}
