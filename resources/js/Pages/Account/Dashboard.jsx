import { Head, Link, router, useForm } from '@inertiajs/react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import EmptyState from '@/Components/ui/EmptyState';
import Field, { Checkbox } from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';
import { date, money } from '@/lib/format';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';

const MapPicker = lazy(() => import('@/Components/forms/MapPicker'));

const tabs = [
    ['orders', 'Orders'],
    ['prescriptions', 'Prescriptions'],
    ['profile', 'Profile'],
    ['security', 'Security'],
];

export default function Dashboard({ profile, cities, orders, prescriptions, stats, signins = [], store, refills, twoFactor, tab: flashedTab }) {
    const [tab, setTab] = useState(flashedTab ?? 'orders');
    // Two-step sign-in forms flash the tab they belong to, so the page stays on Security.
    useEffect(() => {
        if (flashedTab) setTab(flashedTab);
    }, [flashedTab]);

    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title="Your account">
                <meta head-key="robots" name="robots" content="noindex" />
            </Head>
            <Breadcrumbs items={[{ label: 'Account' }]} className="mb-6" />

            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="flex items-end gap-5">
                    <Avatar profile={profile} size="lg" />
                    <div>
                    <p className="eyebrow flex items-center gap-2 text-ink-mute">Your account · <span translate="no" className="normal-case">@{profile.username}</span></p>
                    <h1 className="mt-4 font-display text-title">
                        Hello, <span className="italic">{profile.name.split(' ')[0]}.</span>
                    </h1>
                    </div>
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

            {!profile.email_verified && (
                <div className="mt-10 flex flex-wrap items-center gap-4 rounded-3xl border border-[#e8c66d]/60 bg-[#fdf6e4] p-5 text-sm dark:bg-[#2c2410]" data-testid="verify-email">
                    <Icon name="mail" size={20} className="shrink-0" />
                    <p className="min-w-0 flex-1">Please confirm {profile.email} so order updates and sign-in codes reach you. The link we sent expires after 10 minutes.</p>
                    <Button size="sm" variant="ghost" onClick={() => router.post(route('verification.send'), {}, { preserveScroll: true })}>
                        Send a new link
                    </Button>
                </div>
            )}
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
                {tab === 'orders' && (
                    <div className="space-y-12">
                        <Refills refills={refills} />
                        <Orders orders={orders} />
                    </div>
                )}
                {tab === 'prescriptions' && <Prescriptions prescriptions={prescriptions} />}
                {tab === 'profile' && <Profile profile={profile} cities={cities} store={store} />}
                {tab === 'security' && (
                    <div className="space-y-16">
                        <TwoFactor twoFactor={twoFactor} />
                        <Security signins={signins} />
                    </div>
                )}
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

function Avatar({ profile, size = 'md' }) {
    const cls = size === 'lg' ? 'size-20 text-3xl md:size-24' : 'size-12 text-lg';
    return profile.avatar ? (
        <img src={profile.avatar} alt="" width="96" height="96" className={cn('shrink-0 rounded-full object-cover ring-4 ring-paper', cls)} />
    ) : (
        <span aria-hidden="true" className={cn('grid shrink-0 place-items-center rounded-full bg-mint font-display text-night ring-4 ring-paper', cls)}>
            {profile.name
                .split(' ')
                .slice(0, 2)
                .map((p) => p[0])
                .join('')
                .toUpperCase()}
        </span>
    );
}

function AvatarEditor({ profile }) {
    const input = useRef(null);
    const form = useForm({ avatar: null });

    const pick = (file) => {
        if (!file) return;
        form.setData('avatar', file);
        form.transform(() => ({ avatar: file }));
        form.post(route('account.avatar.update'), { preserveScroll: true, forceFormData: true, onFinish: () => (input.current.value = '') });
    };

    return (
        <div className="flex flex-wrap items-center gap-5 rounded-4xl border border-line bg-card p-5 md:col-span-2">
            <Avatar profile={profile} size="lg" />
            <div className="min-w-0 flex-1">
                <p className="font-medium">Profile picture</p>
                <p className="mt-1 text-sm text-ink-mute">JPG, PNG or WebP up to 3 MB. We crop it to a square.</p>
                {form.errors.avatar && <p className="mt-2 text-sm text-coral">{form.errors.avatar}</p>}
            </div>
            <div className="flex gap-2">
                <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="avatar-input" onChange={(e) => pick(e.target.files?.[0])} />
                <label htmlFor="avatar-input" className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm text-paper">
                    <Icon name="upload" size={14} /> {form.processing ? 'Uploading…' : profile.avatar ? 'Change' : 'Upload'}
                </label>
                {profile.avatar && (
                    <button type="button" onClick={() => router.delete(route('account.avatar.destroy'), { preserveScroll: true })} className="rounded-full border border-line-strong px-4 py-2.5 text-sm hover:border-coral hover:text-coral">
                        Remove
                    </button>
                )}
            </div>
        </div>
    );
}

function Profile({ profile, cities, store }) {
    const form = useForm({
        name: profile.name,
        email: profile.email,
        phone: profile.phone ?? '',
        city: profile.city ?? '',
        address: profile.address ?? '',
        lat: profile.lat ?? '',
        lng: profile.lng ?? '',
        current_password: '',
    });
    const { data, setData, errors, processing } = form;
    const emailChanged = data.email.trim().toLowerCase() !== profile.email;

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.transform((d) => ({ ...d, lat: d.lat === '' ? null : d.lat, lng: d.lng === '' ? null : d.lng }));
                form.put(route('account.profile.update'), { preserveScroll: true, onSuccess: () => form.setData('current_password', '') });
            }}
            className="grid max-w-4xl gap-5 md:grid-cols-2"
        >
            <AvatarEditor profile={profile} />

            <div className="md:col-span-2">
                <p className="mb-2 text-sm font-medium">Username</p>
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper-deep px-4 py-3.5">
                    <Icon name="lock" size={15} className="text-ink-mute" />
                    <span translate="no" className="font-mono">
                        @{profile.username}
                    </span>
                    <span className="text-xs text-ink-mute">Assigned by Zovita and can’t be changed — it identifies you to our care team.</span>
                </div>
            </div>

            <Field label="Full name" placeholder="e.g. Ayesha Khan" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} autoComplete="name" />
            <Field label="Email" placeholder="you@example.com" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} autoComplete="email" hint={emailChanged ? 'You’ll sign in with the new email.' : undefined} />
            {emailChanged && (
                <Field
                    label="Current password (to confirm the email change)"
                    type="password"
                    autoComplete="current-password"
                    value={data.current_password}
                    onChange={(e) => setData('current_password', e.target.value)}
                    error={errors.current_password}
                    className="md:col-span-2"
                />
            )}
            <Field label="Mobile number" placeholder="03XX XXXXXXX" type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} autoComplete="tel" optional />
            <Field as="select" label="City" value={data.city} onChange={(e) => setData('city', e.target.value)} error={errors.city} optional>
                <option value="">Select a city</option>
                {cities.map((c) => (
                    <option key={c}>{c}</option>
                ))}
            </Field>

            <div className="md:col-span-2">
                <p className="mb-2 flex items-center justify-between text-sm font-medium">
                    <span>Delivery location</span>
                    {data.lat !== '' && (
                        <button type="button" onClick={() => form.setData({ ...data, lat: '', lng: '' })} className="text-xs text-ink-mute underline underline-offset-4 hover:text-coral">
                            Clear pin
                        </button>
                    )}
                </p>
                <Suspense fallback={<div className="grid h-80 place-items-center rounded-3xl border border-line bg-card text-sm text-ink-mute">Loading map…</div>}>
                    <MapPicker
                        lat={profile.lat}
                        lng={profile.lng}
                        fallback={store}
                        onChange={({ lat, lng, address }) => form.setData((d) => ({ ...d, lat, lng, address: address ?? d.address }))}
                    />
                </Suspense>
                {(errors.lat || errors.lng) && <p className="mt-2 text-sm text-coral">{errors.lat || errors.lng}</p>}
            </div>

            <Field
                as="textarea"
                label="Delivery address"
                placeholder="House, street, area and landmark"
                rows={3}
                value={data.address}
                onChange={(e) => setData('address', e.target.value)}
                error={errors.address}
                className="md:col-span-2"
                hint="Filled from the pin — add your house number and a landmark."
                optional
            />
            <div className="md:col-span-2">
                <Button type="submit" loading={processing}>
                    Save changes
                </Button>
            </div>
        </form>
    );
}

function Security({ signins }) {
    const form = useForm({ current_password: '', password: '', password_confirmation: '' });
    const { data, setData, errors, processing } = form;

    return (
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put(route('account.password.update'), { preserveScroll: true, errorBag: 'password', onSuccess: () => form.reset() });
                }}
                className="grid max-w-xl content-start gap-5"
            >
                <h2 className="font-display text-3xl">Change password</h2>
                <Field label="Current password" placeholder="Your current password" type="password" autoComplete="current-password" value={data.current_password} onChange={(e) => setData('current_password', e.target.value)} error={errors.current_password} />
                <Field label="New password" placeholder="At least 8 characters" type="password" autoComplete="new-password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} hint="8+ characters with letters and numbers." />
                <Field label="Confirm new password" placeholder="Re-enter the new password" type="password" autoComplete="new-password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} />
                <div>
                    <Button type="submit" loading={processing}>
                        Update password
                    </Button>
                </div>
            </form>

            <div>
                <h2 className="font-display text-3xl">Recent sign-ins</h2>
                <p className="mt-2 text-sm text-ink-mute">Don’t recognise one? Change your password and tell our care team.</p>
                <ul className="mt-6 divide-y divide-line border-y border-line">
                    {signins.length === 0 && <li className="py-4 text-sm text-ink-mute">No sign-ins recorded yet.</li>}
                    {signins.map((s) => (
                        <li key={s.at + s.type} className="flex items-center gap-4 py-4 text-sm">
                            <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', s.type === 'auth.failed' ? 'bg-coral/10 text-coral' : 'bg-mint-soft text-teal')}>
                                <Icon name={s.type === 'auth.failed' ? 'alert' : 'check'} size={15} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block">{s.type === 'auth.failed' ? 'Wrong password attempt' : 'Signed in'}</span>
                                <span className="block text-xs text-ink-mute">
                                    {s.browser} · {s.ip}
                                </span>
                            </span>
                            <span className="shrink-0 text-xs text-ink-mute">{new Date(s.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

/** Medicines bought regularly that are due again soon, with one-tap reorder and an off switch. */
function Refills({ refills }) {
    if (!refills) return null;
    const toggle = (enabled) => router.put(route('account.preferences.update'), { refill_reminders: enabled }, { preserveScroll: true });

    return (
        <section id="refills" aria-labelledby="refills-title" data-testid="refills">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 id="refills-title" className="font-display text-3xl">Refills due</h2>
                    <p className="mt-1 text-sm text-ink-mute">Worked out from how often you order the same medicine. We e-mail you a few days before you run out.</p>
                </div>
                <Checkbox label="E-mail me refill reminders" checked={refills.enabled} onChange={(e) => toggle(e.target.checked)} />
            </div>
            {refills.items.length === 0 ? (
                <p className="mt-6 rounded-3xl border border-dashed border-line-strong p-5 text-sm text-ink-mute">Nothing due right now. Once you've bought the same medicine twice, it shows up here when it's time to reorder.</p>
            ) : (
                <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {refills.items.map((r) => (
                        <li key={r.id} className="flex items-center gap-4 rounded-3xl border border-line bg-card p-4">
                            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-plate">
                                {r.product?.image && <img src={r.product.image} alt="" className="size-12 object-contain mix-blend-multiply" loading="lazy" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 text-sm font-medium">{r.product?.name}</span>
                                <span className={cn('mt-1 block text-xs', r.overdue ? 'text-coral' : 'text-ink-mute')}>
                                    {r.overdue ? 'Was due' : 'Due'} {date(r.due_at)} · about every {r.interval_days} days
                                </span>
                                <span className="mt-2 flex flex-wrap gap-3 text-sm">
                                    <button type="button" onClick={() => router.post(route('account.refills.add', r.id))} className="font-medium text-teal underline-offset-4 hover:underline">
                                        Add to bag
                                    </button>
                                    <button type="button" onClick={() => router.delete(route('account.refills.dismiss', r.id), { preserveScroll: true })} className="text-ink-mute hover:text-ink">
                                        Not now
                                    </button>
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/** Optional two-step sign-in for customers: QR set-up, recovery codes, turn off with password. */
function TwoFactor({ twoFactor }) {
    const confirm = useForm({ code: '' });
    const off = useForm({ password: '' });
    const codes = useForm({ password: '' });
    if (!twoFactor) return null;

    return (
        <section aria-labelledby="two-factor-title" className="grid grid-cols-1 gap-10 lg:grid-cols-2" data-testid="two-factor">
            <div>
                <h2 id="two-factor-title" className="font-display text-3xl">Two-step sign-in</h2>
                <p className="mt-2 max-w-xl text-sm text-ink-mute">
                    Sign in with your password and a 6-digit code from an authenticator app on your phone, so a leaked password alone can't open your account, orders or prescriptions.
                </p>
                <p className="mt-4">
                    <Badge tone={twoFactor.enabled ? 'mint' : 'soft'}>{twoFactor.enabled ? 'On' : 'Off'}</Badge>
                </p>
                {!twoFactor.enabled && !twoFactor.setup && (
                    <Button className="mt-6" onClick={() => router.post(route('account.two-factor.start'), {}, { preserveScroll: true })} icon={<Icon name="shield" size={16} />}>
                        Turn on two-step sign-in
                    </Button>
                )}
                {twoFactor.enabled && (
                    <p className="mt-4 text-sm">
                        {twoFactor.recovery_left} recovery {twoFactor.recovery_left === 1 ? 'code' : 'codes'} left.
                    </p>
                )}
            </div>

            <div>
                {twoFactor.recovery_codes?.length > 0 && (
                    <div className="mb-8 rounded-3xl border-2 border-teal bg-mint-soft p-5" data-testid="recovery-codes">
                        <p className="font-medium">Save your recovery codes</p>
                        <p className="mt-1 text-sm text-ink-soft">Each code signs you in once if you lose your phone. They won't be shown again.</p>
                        <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm">
                            {twoFactor.recovery_codes.map((c) => (
                                <li key={c} className="select-all rounded-xl bg-paper px-3 py-2 text-center">
                                    {c}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {twoFactor.setup && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            confirm.post(route('account.two-factor.confirm'), { preserveScroll: true, onError: () => confirm.reset('code') });
                        }}
                        className="grid grid-cols-1 gap-5 rounded-4xl border border-line p-6 sm:grid-cols-[auto_1fr]"
                        noValidate
                    >
                        <div className="size-[180px] max-w-full rounded-2xl bg-white p-3 [&_svg]:h-full [&_svg]:w-full" role="img" aria-label="QR code for your authenticator app" dangerouslySetInnerHTML={{ __html: twoFactor.setup.qr }} />
                        <div className="min-w-0 space-y-4 text-sm">
                            <p>1. Scan this with Google Authenticator, Microsoft Authenticator or 1Password.</p>
                            <p>
                                Can't scan? Enter this key: <code className="mt-1 block select-all break-all rounded-xl bg-paper-deep px-3 py-2 font-mono" data-testid="totp-secret">{twoFactor.setup.secret}</code>
                            </p>
                            <Field label="2. Type the 6-digit code" inputMode="numeric" maxLength={7} autoComplete="one-time-code" value={confirm.data.code} onChange={(e) => confirm.setData('code', e.target.value)} error={confirm.errors.code} />
                            <div className="flex flex-wrap gap-3">
                                <Button type="submit" loading={confirm.processing}>
                                    Confirm and turn on
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => router.delete(route('account.two-factor.cancel'), { preserveScroll: true })}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </form>
                )}

                {twoFactor.enabled && (
                    <div className="space-y-8">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                codes.post(route('account.two-factor.recovery'), { preserveScroll: true, onFinish: () => codes.reset() });
                            }}
                            className="grid max-w-md gap-3"
                            noValidate
                        >
                            <p className="font-medium">New recovery codes</p>
                            <Field label="Your password" type="password" autoComplete="current-password" value={codes.data.password} onChange={(e) => codes.setData('password', e.target.value)} error={codes.errors.password} />
                            <div>
                                <Button type="submit" variant="ghost" size="sm" loading={codes.processing}>
                                    Make new codes
                                </Button>
                            </div>
                        </form>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                off.delete(route('account.two-factor.destroy'), { preserveScroll: true, onFinish: () => off.reset() });
                            }}
                            className="grid max-w-md gap-3"
                            noValidate
                        >
                            <p className="font-medium">Turn off two-step sign-in</p>
                            <Field label="Your password" type="password" autoComplete="current-password" value={off.data.password} onChange={(e) => off.setData('password', e.target.value)} error={off.errors.password} />
                            <div>
                                <Button type="submit" variant="danger" size="sm" loading={off.processing}>
                                    Turn off
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </section>
    );
}
