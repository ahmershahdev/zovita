import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import Button from '@/Components/ui/Button';
import Icon from '@/Components/ui/Icon';
import { money } from '@/lib/format';

/**
 * The sandbox gateway's "hosted card page" (local, demo and test environments only). Paying or
 * declining sends a signed webhook through the same verification as the real gateway.
 */
export default function SandboxPay({ payment, order }) {
    const [busy, setBusy] = useState(null);
    const complete = (outcome) => {
        setBusy(outcome);
        router.post(route('payments.sandbox.complete', payment.id), { outcome }, { onFinish: () => setBusy(null) });
    };
    const open = payment.status === 'pending';

    return (
        <section className="container-x pb-16 pt-10 md:pt-16">
            <Head title="Test payment">
                <meta head-key="robots" name="robots" content="noindex,nofollow" />
            </Head>
            <div className="mx-auto max-w-md rounded-4xl border-2 border-dashed border-teal/50 bg-card p-8 md:p-10">
                <p className="eyebrow text-teal">Sandbox payment page · no real money</p>
                <h1 className="mt-4 font-display text-4xl">Pay {money(payment.amount, { precise: true })}</h1>
                <p className="mt-2 text-sm text-ink-mute">
                    Zovita+ order <span className="font-mono">{order.number}</span>. In production this is the payment provider's own secure page.
                </p>
                <div className="mt-6 rounded-3xl bg-paper-deep p-5 font-mono text-sm">
                    <p>4242 4242 4242 4242</p>
                    <p className="mt-1 text-ink-mute">12 / 34 · CVC 123</p>
                </div>
                {open ? (
                    <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Button onClick={() => complete('pay')} loading={busy === 'pay'} disabled={!!busy} icon={<Icon name="check" size={16} />}>
                            Pay now
                        </Button>
                        <Button onClick={() => complete('decline')} loading={busy === 'decline'} disabled={!!busy} variant="danger">
                            Decline
                        </Button>
                    </div>
                ) : (
                    <p className="mt-8 rounded-2xl bg-paper-deep p-4 text-sm">This payment is already {payment.status}.</p>
                )}
            </div>
        </section>
    );
}
