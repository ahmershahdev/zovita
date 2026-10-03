import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Button from '@/Components/ui/Button';
import Icon from '@/Components/ui/Icon';
import { money } from '@/lib/format';

/**
 * After the card page. The order is only "paid" once the payment provider's signed webhook says
 * so, which can take a few seconds, so this page checks again quietly until it knows.
 */
export default function CheckoutPayment({ order, cancelled, canRetry }) {
    const [checks, setChecks] = useState(0);
    const waiting = order.payment_status === 'pending' && !cancelled;

    useEffect(() => {
        if (!waiting || checks >= 20) return undefined;
        const timer = setTimeout(() => router.reload({ only: ['order', 'canRetry'], onFinish: () => setChecks((c) => c + 1) }), 3000);
        return () => clearTimeout(timer);
    }, [waiting, checks]);

    const expires = order.expires_at ? new Date(order.expires_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : null;
    const failed = ['expired', 'failed'].includes(order.payment_status);

    return (
        <section className="container-x pb-16 pt-10 md:pt-16">
            <Head title="Payment">
                <meta head-key="robots" name="robots" content="noindex,nofollow" />
            </Head>
            <div className="mx-auto max-w-xl rounded-4xl border border-line bg-card p-8 text-center md:p-12" aria-live="polite">
                <span className={`mx-auto grid size-16 place-items-center rounded-full ${failed ? 'bg-coral/10 text-coral' : 'bg-mint-soft text-teal'}`}>
                    <Icon name={failed ? 'alert' : waiting ? 'clock' : 'lock'} size={28} />
                </span>
                <p className="eyebrow mt-6 text-ink-mute">Order {order.number}</p>
                <h1 className="mt-3 font-display text-4xl">
                    {failed ? 'Payment not completed' : cancelled ? 'Payment cancelled' : waiting && checks < 20 ? 'Confirming your payment…' : 'Still waiting for the payment'}
                </h1>
                <p className="mt-4 text-ink-soft">
                    {failed
                        ? 'This order was cancelled because the payment didn\'t go through in time. Nothing was charged, and the items are back on sale.'
                        : cancelled
                          ? `Your items are held until ${expires}. You can try again, or go back and choose cash on delivery.`
                          : waiting && checks < 20
                            ? `We're waiting for the bank to confirm ${money(order.total)}. This usually takes a few seconds.`
                            : 'The bank hasn\'t confirmed yet. If you paid, you\'ll get an e-mail as soon as it does; you can safely leave this page.'}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    {canRetry && (cancelled || checks >= 20) && (
                        <Button onClick={() => router.post(route('payments.retry', order.number))} icon={<Icon name="lock" size={16} />}>
                            Try the payment again
                        </Button>
                    )}
                    {failed && (
                        <Button href={route('shop.index')} icon={<Icon name="arrow" size={16} />}>
                            Back to the shop
                        </Button>
                    )}
                    <Button href={route('orders.track')} variant="ghost">
                        Track an order
                    </Button>
                </div>
            </div>
        </section>
    );
}
