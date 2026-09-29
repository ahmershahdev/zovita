import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import EmptyState from '@/Components/ui/EmptyState';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';
import { date, money } from '@/lib/format';

const tabs = [
    ['orders', 'Orders'],
    ['prescriptions', 'Prescriptions'],
    ['profile', 'Profile'],
    ['security', 'Security'],
];

export default function Dashboard({ profile, cities, orders, prescriptions, stats }) {
    const [tab, setTab] = useState('orders');

    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title="Your account">
                <meta name="robots" content="noindex" />
            </Head>

            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="eyebrow text-ink-mute">Your account</p>
                    <h1 className="mt-4 font-display text-title">
                        Hello, <span className="italic">{profile.name.split(' ')[0]}.</span>
                    </h1>
                </div>
                <button type="button" onClick={() => router.post(route('logout'))} className="inline-flex items-center gap-2 self-start rounded-full border border-line-strong px-5 py-3 text-sm transition hover:bg-ink hover:text-paper md:self-auto">
                    <Icon name="logout" size={16} /> Sign out
                </button>
            </div>

            <div className="mt-10 grid gap-px overflow-hidden rounded-4xl border border-line bg-line sm:grid-cols-3">
                {[
                    ['Orders placed', stats.orders],
                    ['Total spent', money(stats.spent)],
                    ['Saved items', stats.wishlist],
                ].map(([label, value]) => (
                    <div key={label} className="bg-paper p-6">
                        <p className="eyebrow text-ink-mute">{label}</p>
                        <p className="mt-3 font-display text-5xl">{value}</p>
                    </div>
                ))}
            </div>

            <div className="scrollbar-none mt-12 flex gap-2 overflow-x-auto border-b border-line" role="tablist">
                {tabs.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={tab === key}
                        onClick={() => setTab(key)}
                        className={cn('relative shrink-0 px-4 pb-4 text-sm transition', tab === key ? 'text-ink' : 'text-ink-mute hover:text-ink')}
                    >
                        {label}
                        {tab === key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" />}
                    </button>
                ))}
            </div>

            <div className="mt-10" role="tabpanel">
                {tab === 'orders' && <Orders orders={orders} />}
                {tab === 'prescriptions' && <Prescriptions prescriptions={prescriptions} />}
                {tab === 'profile' && <Profile profile={profile} cities={cities} />}
                {tab === 'security' && <Security />}
            </div>
        </section>
    );
}

function Orders({ orders }) {
    if (!orders.length) {
        return <EmptyState icon="package" title="No orders yet" body="When you place an order, you'll be able to follow it here." action={<Button href={route('shop.index')}>Start shopping</Button>} />;
    }
    return (
        <ul className="divide-y divide-line border-y border-line">
            {orders.map((o) => (
                <li key={o.number}>
                    <Link href={route('account.orders.show', o.number)} className="group grid grid-cols-2 items-center gap-4 py-5 md:grid-cols-5">
                        <span className="font-mono text-sm">{o.number}</span>
                        <span className="text-sm text-ink-mute">{date(o.placed_at)}</span>
                        <span className="text-sm">
                            <Badge tone={o.status === 'delivered' ? 'mint' : o.status === 'cancelled' ? 'coral' : 'soft'}>{o.status_label}</Badge>
                        </span>
                        <span className="text-sm text-ink-mute">{o.items_count} items</span>
                        <span className="flex items-center justify-end gap-3 font-medium">
                            {money(o.total)}
                            <Icon name="arrow" size={16} className="transition group-hover:translate-x-1" />
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}

function Prescriptions({ prescriptions }) {
    if (!prescriptions.length) {
        return <EmptyState icon="rx" title="No prescriptions" body="Upload one and our pharmacist will call you to confirm." action={<Button href={route('prescriptions.create')}>Upload prescription</Button>} />;
    }
    return (
        <ul className="divide-y divide-line border-y border-line">
            {prescriptions.map((p) => (
                <li key={p.reference} className="grid grid-cols-2 items-center gap-4 py-5 md:grid-cols-4">
                    <span className="font-mono text-sm">{p.reference}</span>
                    <span className="truncate text-sm text-ink-mute">{p.file}</span>
                    <span className="text-sm text-ink-mute">{date(p.submitted_at)}</span>
                    <span className="text-right">
                        <Badge tone={p.status === 'Approved' ? 'mint' : p.status === 'Rejected' ? 'coral' : 'soft'}>{p.status}</Badge>
                    </span>
                </li>
            ))}
        </ul>
    );
}

function Profile({ profile, cities }) {
    const form = useForm({ ...profile, phone: profile.phone ?? '', city: profile.city ?? '', address: profile.address ?? '' });
    const { data, setData, errors, processing } = form;

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.put(route('account.profile.update'), { preserveScroll: true });
            }}
            className="grid max-w-3xl gap-5 md:grid-cols-2"
        >
            <Field label="Full name" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} />
            <Field label="Email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} />
            <Field label="Mobile number" type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} optional />
            <Field as="select" label="City" value={data.city} onChange={(e) => setData('city', e.target.value)} error={errors.city} optional>
                <option value="">Select a city</option>
                {cities.map((c) => (
                    <option key={c}>{c}</option>
                ))}
            </Field>
            <Field as="textarea" label="Default delivery address" rows={3} value={data.address} onChange={(e) => setData('address', e.target.value)} error={errors.address} className="md:col-span-2" optional />
            <div className="md:col-span-2">
                <Button type="submit" loading={processing}>
                    Save changes
                </Button>
            </div>
        </form>
    );
}

function Security() {
    const form = useForm({ current_password: '', password: '', password_confirmation: '' });
    const { data, setData, errors, processing } = form;

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.put(route('account.password.update'), { preserveScroll: true, errorBag: 'password', onSuccess: () => form.reset() });
            }}
            className="grid max-w-xl gap-5"
        >
            <Field label="Current password" type="password" autoComplete="current-password" value={data.current_password} onChange={(e) => setData('current_password', e.target.value)} error={errors.current_password} />
            <Field label="New password" type="password" autoComplete="new-password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} hint="8+ characters with letters and numbers." />
            <Field label="Confirm new password" type="password" autoComplete="new-password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} />
            <div>
                <Button type="submit" loading={processing}>
                    Update password
                </Button>
            </div>
        </form>
    );
}
