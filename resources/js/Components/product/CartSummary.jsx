import Icon from '@/Components/ui/Icon';
import useT from '@/hooks/useT';
import { money } from '@/lib/format';

/** Order totals block shared by the bag and checkout pages. */
export default function CartSummary({ cart, children }) {
    const t = useT();
    const remaining = Math.max(0, cart.free_delivery_over - (cart.subtotal - cart.savings));
    const progress = Math.min(100, ((cart.subtotal - cart.savings) / cart.free_delivery_over) * 100);

    return (
        <div className="rounded-4xl bg-card p-6 md:p-8">
            <div className="mb-6">
                <p className="text-sm">
                    {remaining > 0 ? (
                        <>{t('Add :amount more for free delivery', { amount: money(remaining) })}</>
                    ) : (
                        <span className="flex items-center gap-2 text-teal">
                            <Icon name="check" size={16} /> You've unlocked free delivery
                        </span>
                    )}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-deep">
                    <div className="h-full rounded-full bg-teal transition-[width] duration-700 ease-[var(--ease-expo)]" style={{ width: `${progress}%` }} />
                </div>
            </div>

            <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <dt className="text-ink-mute">{t('Subtotal (:count items)', { count: cart.count })}</dt>
                    <dd>{money(cart.subtotal, { precise: true })}</dd>
                </div>
                {cart.savings > 0 && (
                    <div className="flex justify-between text-teal">
                        <dt>Discount</dt>
                        <dd>− {money(cart.savings, { precise: true })}</dd>
                    </div>
                )}
                {cart.offer_discount > 0 && (
                    <div className="rounded-2xl bg-mint-soft p-3">
                        <div className="flex justify-between font-medium text-teal">
                            <dt className="flex items-center gap-1.5">
                                <Icon name="sparkle" size={14} /> Your personal offers
                            </dt>
                            <dd>− {money(cart.offer_discount, { precise: true })}</dd>
                        </div>
                        <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                            {cart.offers.map((o) => (
                                <li key={o.id} className="flex justify-between gap-3">
                                    <span>{o.reason}</span>
                                    <span className="shrink-0 font-mono">−{o.percent}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="flex justify-between">
                    <dt className="text-ink-mute">Delivery</dt>
                    <dd>{cart.delivery_fee > 0 ? money(cart.delivery_fee) : 'Free'}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-line pt-4">
                    <dt className="font-medium">Total</dt>
                    <dd className="font-display text-4xl">{money(cart.total, { precise: true })}</dd>
                </div>
            </dl>
            {children}
        </div>
    );
}
