import Icon from '@/Components/ui/Icon';
import { money } from '@/lib/format';

/** Order totals block shared by the bag and checkout pages. */
export default function CartSummary({ cart, children }) {
    const remaining = Math.max(0, cart.free_delivery_over - (cart.subtotal - cart.savings));
    const progress = Math.min(100, ((cart.subtotal - cart.savings) / cart.free_delivery_over) * 100);

    return (
        <div className="rounded-4xl bg-card p-6 md:p-8">
            <div className="mb-6">
                <p className="text-sm">
                    {remaining > 0 ? (
                        <>
                            Add <strong>{money(remaining)}</strong> more for free delivery
                        </>
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
                    <dt className="text-ink-mute">Subtotal ({cart.count} items)</dt>
                    <dd>{money(cart.subtotal, { precise: true })}</dd>
                </div>
                {cart.savings > 0 && (
                    <div className="flex justify-between text-teal">
                        <dt>Discount</dt>
                        <dd>− {money(cart.savings, { precise: true })}</dd>
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
