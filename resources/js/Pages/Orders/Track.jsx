import { Head, Link, useForm } from '@inertiajs/react';
import OrderDetail from '@/Components/product/OrderDetail';
import OrderTracker from '@/Components/product/OrderTracker';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import { money } from '@/lib/format';

export default function OrderTrack({ order, recent = [] }) {
    const form = useForm({ number: '', email: '' });

    const submit = (e) => {
        e.preventDefault();
        form.post(route('orders.track.lookup'), { preserveScroll: true });
    };

    return (
        <section className="container-x pb-10 pt-10 md:pt-14">
            <Head title={order ? `Tracking ${order.number}` : 'Track your order'}>
                <meta head-key="robots" name="robots" content="noindex" />
            </Head>
            <Breadcrumbs items={[{ label: 'Home', href: route('home') }, { label: 'Track order', href: order ? route('orders.track') : null }, order && { label: order.number }].filter(Boolean)} />

            {order ? (
                <>
                    <h1 className="mt-6 font-display text-title">
                        Your order, <span className="italic">live.</span>
                    </h1>
                    <div className="mt-10">
                        <OrderTracker order={order} />
                    </div>
                    <div className="mt-10">
                        <OrderDetail order={order} hideTimeline />
                    </div>
                    <Link href={route('orders.track')} className="mt-10 inline-flex items-center gap-2 text-sm text-ink-mute underline underline-offset-4 hover:text-ink">
                        <Icon name="arrowLeft" size={14} /> Track another order
                    </Link>
                </>
            ) : (
                <div className="mt-6 grid gap-12 lg:grid-cols-12">
                    <div className="lg:col-span-7">
                        <h1 className="font-display text-title">
                            Where's my <span className="italic">order?</span>
                        </h1>
                        <p className="mt-6 max-w-md text-ink-soft">Enter the order number from your confirmation email and the email you used at checkout. Nothing is put in the page address.</p>

                        <form onSubmit={submit} className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-2" noValidate>
                            <Field
                                label="Order number"
                                icon="package"
                                placeholder="ZV-260930-ABCDE"
                                autoComplete="off"
                                value={form.data.number}
                                onChange={(e) => form.setData('number', e.target.value.toUpperCase())}
                                error={form.errors.number}
                                className="font-mono"
                                maxLength={32}
                                required
                            />
                            <Field
                                label="Email used at checkout"
                                type="email"
                                icon="mail"
                                placeholder="you@example.com"
                                autoComplete="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                error={form.errors.email}
                                maxLength={120}
                                required
                            />
                            <Button type="submit" size="lg" loading={form.processing} className="sm:col-span-2 sm:w-fit" icon={<Icon name="search" size={18} />}>
                                Track my order
                            </Button>
                        </form>
                    </div>

                    <aside className="lg:col-span-5">
                        {recent.length > 0 ? (
                            <div className="rounded-4xl border border-line bg-card p-6">
                                <p className="eyebrow text-ink-mute">Your recent orders</p>
                                <ul className="mt-4 divide-y divide-line">
                                    {recent.map((o) => (
                                        <li key={o.number}>
                                            <Link href={route('orders.track.show', o.number)} className="group flex items-center justify-between gap-4 py-4">
                                                <span>
                                                    <span className="block font-mono text-sm">{o.number}</span>
                                                    <span className="text-xs text-ink-mute">
                                                        {o.date} · {money(o.total)}
                                                    </span>
                                                </span>
                                                <span className="flex items-center gap-3 text-sm">
                                                    {o.status}
                                                    <Icon name="arrow" size={16} className="transition-transform group-hover:translate-x-1" />
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="rounded-4xl bg-night p-8 text-snow">
                                <Icon name="truck" size={28} className="text-mint" />
                                <p className="mt-6 font-display text-3xl leading-tight">Watch your parcel travel across a live 3D map.</p>
                                <p className="mt-3 text-sm text-snow/70">Signed-in customers see every order here automatically.</p>
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </section>
    );
}
