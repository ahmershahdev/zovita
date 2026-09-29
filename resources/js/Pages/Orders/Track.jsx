import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import OrderDetail from '@/Components/product/OrderDetail';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';

export default function OrderTrack({ query, order, notFound }) {
    const [form, setForm] = useState(query);
    const [loading, setLoading] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        router.get(route('orders.track'), form, { preserveScroll: true, onStart: () => setLoading(true), onFinish: () => setLoading(false) });
    };

    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title="Track your order" />
            <p className="eyebrow text-ink-mute">Order tracking</p>
            <h1 className="mt-4 font-display text-title">
                Where's my <span className="italic">order?</span>
            </h1>

            <form onSubmit={submit} className="mt-12 grid max-w-4xl items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
                <Field label="Order number" placeholder="ZV-260930-ABCDE" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className="font-mono" required />
                <Field label="Email used at checkout" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <Button type="submit" size="lg" loading={loading} icon={<Icon name="search" size={18} />}>
                    Track
                </Button>
            </form>

            {notFound && (
                <p className="mt-8 max-w-4xl rounded-2xl bg-coral/10 p-4 text-sm text-coral">
                    We couldn't find an order with that number and email. Check your confirmation email, or contact us and we'll look it up.
                </p>
            )}

            {order && (
                <div className="mt-14">
                    <OrderDetail order={order} />
                </div>
            )}
        </section>
    );
}
