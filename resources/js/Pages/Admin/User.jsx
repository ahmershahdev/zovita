import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import AdminLayout, { PageGuide, Pager, Panel, StatusPill } from '@/Layouts/AdminLayout';
import { cn } from '@/lib/cn';
import { date, money } from '@/lib/format';
import { OrderStatus } from './Dashboard';

const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

/** Icon + tone for each kind of activity, so the timeline reads at a glance. */
const ACTIVITY = {
    'auth.login': ['check', 'good', 'Signed in'],
    'auth.logout': ['logout', 'neutral', 'Signed out'],
    'auth.failed': ['alert', 'bad', 'Wrong password'],
    'account.created': ['user', 'good', 'Joined'],
    'order.placed': ['package', 'good', 'Order'],
    'prescription.uploaded': ['rx', 'neutral', 'Prescription'],
    'cart.add': ['bag', 'neutral', 'Bag'],
    wishlist: ['heart', 'neutral', 'Wishlist'],
    'profile.updated': ['user', 'neutral', 'Profile'],
    'profile.email': ['mail', 'warn', 'Email changed'],
    'profile.password': ['lock', 'warn', 'Password changed'],
    'profile.avatar': ['user', 'neutral', 'Photo'],
    'profile.username': ['user', 'warn', 'Username'],
    'ban.issued': ['lock', 'bad', 'Banned'],
    'ban.lifted': ['check', 'good', 'Ban lifted'],
    'ban.blocked': ['alert', 'bad', 'Blocked attempt'],
};

const LEVELS = [
    {
        key: 'temporary',
        title: 'Temporary ban',
        tone: 'warn',
        summary: 'A time-out. The account is locked for a set time, then works again by itself.',
        blocks: 'Their account, and new sign-ups with the same email, phone or device — until the ban ends.',
        use: 'Rude messages, a few cancelled orders, suspicious but not proven behaviour.',
    },
    {
        key: 'permanent',
        title: 'Permanent ban',
        tone: 'bad',
        summary: 'The account is closed for good.',
        blocks: 'Their account forever, and any new account using the same email (even Gmail variations), phone number, device or browser.',
        use: 'Repeated abuse, fake orders, fraud with a known person.',
    },
    {
        key: 'deep',
        title: 'Deep ban',
        tone: 'bad',
        summary: 'Everything a permanent ban does, plus their internet connection.',
        blocks: 'Their account, email, phone, devices and browsers — and the internet addresses and network they used. Anyone on that network sees a “suspended” page instead of the shop.',
        use: 'Forged prescriptions, attacks on the site, someone who keeps coming back. Careful: shared Wi-Fi (offices, hostels) is blocked too.',
    },
];

const QUICK_REASONS = ['Fake or forged prescription', 'Repeated cancelled cash-on-delivery orders', 'Abusive messages to our team', 'Suspected fraud', 'Creating multiple accounts'];

export default function UserPage({ customer, stats, activity, connections, orders, interests, bans, preview, durations }) {
    const [tab, setTab] = useState('activity');
    const [banning, setBanning] = useState(false);
    const activeBan = bans.find((b) => b.active);

    return (
        <AdminLayout
            title={customer.name}
            actions={
                customer.is_admin ? (
                    <StatusPill tone="good">
                        <Icon name="shield" size={12} /> Staff account
                    </StatusPill>
                ) : customer.banned ? (
                    <button type="button" onClick={() => router.delete(route('admin.users.unban', customer.id), { preserveScroll: true })} className="rounded-full bg-teal px-5 py-3 text-sm text-white">
                        Lift the ban
                    </button>
                ) : (
                    <button type="button" onClick={() => setBanning(true)} className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-3 text-sm text-white">
                        <Icon name="lock" size={15} /> Ban this customer
                    </button>
                )
            }
        >
            <Link href={route('admin.users.index')} className="-mt-6 mb-6 inline-flex items-center gap-2 text-sm text-ink-mute hover:text-ink">
                <Icon name="arrowLeft" size={14} /> All customers
            </Link>

            <PageGuide
                id="user"
                steps={[
                    'The top shows who this customer is, how long they have been with us and what they have spent.',
                    '“Activity” is everything they did, newest first: sign-ins, orders, prescriptions and changes to their profile.',
                    '“Where they sign in from” lists their internet addresses and devices. Many different ones in a short time can mean a shared or stolen account.',
                    'To stop someone, press “Ban this customer” and follow the three steps. You can lift any ban later.',
                ]}
            />

            {customer.banned && activeBan && (
                <div className="mb-6 flex flex-wrap items-center gap-4 rounded-4xl border border-coral/30 bg-coral/5 p-5">
                    <span className="grid size-11 place-items-center rounded-full bg-coral text-white">
                        <Icon name="lock" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="font-medium">
                            {activeBan.label} {activeBan.expires_at ? `— ends ${when(activeBan.expires_at)}` : '— no end date'}
                        </p>
                        <p className="text-sm text-ink-soft">
                            “{activeBan.reason}” · by {activeBan.by ?? 'staff'} on {when(activeBan.created_at)} · blocking {activeBan.identifiers} identifiers
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Panel className="lg:col-span-1" title="Profile" help="Contact details the customer gave us. The username is assigned by Zovita; only staff can change it.">
                    <div className="flex items-center gap-4">
                        {customer.avatar ? (
                            <img src={customer.avatar} alt="" className="size-16 rounded-full object-cover" />
                        ) : (
                            <span className="grid size-16 place-items-center rounded-full bg-mint font-display text-2xl text-night">{customer.name[0]}</span>
                        )}
                        <div className="min-w-0">
                            <p className="truncate font-medium">{customer.name}</p>
                            <p translate="no" className="font-mono text-sm text-ink-mute">
                                @{customer.username}
                            </p>
                        </div>
                    </div>
                    <UsernameEditor customer={customer} />
                    <dl className="mt-6 space-y-3 text-sm">
                        {[
                            ['Email', customer.email],
                            ['Phone', customer.phone || '—'],
                            ['City', customer.city || '—'],
                            ['Address', customer.address || '—'],
                            ['Customer since', date(customer.joined)],
                            ['Last active', when(customer.last_seen)],
                            ['Last sign-in', `${when(customer.last_login_at)}${customer.last_login_ip ? ` · ${customer.last_login_ip}` : ''}`],
                        ].map(([k, v]) => (
                            <div key={k}>
                                <dt className="text-xs text-ink-mute">{k}</dt>
                                <dd className="break-words">{v}</dd>
                            </div>
                        ))}
                    </dl>
                    {customer.lat && (
                        <a href={`https://www.openstreetmap.org/?mlat=${customer.lat}&mlon=${customer.lng}#map=17/${customer.lat}/${customer.lng}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
                            <Icon name="globe" size={14} /> Open their delivery pin on the map
                        </a>
                    )}
                </Panel>

                <div className="grid content-start gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
                    {[
                        ['Orders', stats.orders, 'All orders this customer has placed.'],
                        ['Spent', money(stats.spent), 'Total of their orders, not counting cancelled ones.'],
                        ['Cancelled', stats.cancelled, 'Many cancelled cash orders can mean fake orders.'],
                        ['Prescriptions', stats.prescriptions, 'Prescriptions they uploaded for review.'],
                        ['Wrong passwords (30 days)', stats.failed_logins_30d, 'A high number can mean someone is trying to break into the account.'],
                        ['Devices', stats.devices, 'Different phones/computers used. Usually 1–3.'],
                        ['Internet addresses', stats.ips, 'Different connections used (home, mobile data, work).'],
                    ].map(([label, value, hint]) => (
                        <div key={label} className="rounded-4xl border border-line bg-card p-5" title={hint}>
                            <p className="text-xs text-ink-mute">{label}</p>
                            <p className="mt-2 font-display text-3xl leading-none">{value}</p>
                            <p className="mt-2 text-xs leading-snug text-ink-mute">{hint}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="scrollbar-none mt-10 flex gap-2 overflow-x-auto border-b border-line" role="tablist">
                {[
                    ['activity', 'Activity'],
                    ['connections', 'Where they sign in from'],
                    ['orders', 'Orders & interests'],
                    ['bans', `Ban history (${bans.length})`],
                ].map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cn('relative shrink-0 px-4 pb-4 text-sm', tab === key ? 'text-ink' : 'text-ink-mute hover:text-ink')}>
                        {label}
                        {tab === key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" />}
                    </button>
                ))}
            </div>

            <div className="mt-6">
                {tab === 'activity' && (
                    <Panel title="Activity timeline" help="Every recorded action by this customer, newest first. Red items need attention: wrong-password attempts, bans, or attempts blocked by a ban.">
                        {activity.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-ink-mute">No activity recorded yet.</p>
                        ) : (
                            <ol className="relative space-y-1">
                                {activity.data.map((a) => {
                                    const [icon, tone, label] = ACTIVITY[a.type] ?? ['spark', 'neutral', 'Activity'];
                                    return (
                                        <li key={a.id} className="flex items-start gap-4 rounded-2xl px-2 py-3 hover:bg-paper-deep/50">
                                            <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-full', { good: 'bg-mint-soft text-teal', bad: 'bg-coral/10 text-coral', warn: 'bg-[#fdf1d8] text-[#8a5a00]', neutral: 'bg-paper-deep text-ink-soft' }[tone])}>
                                                <Icon name={icon} size={15} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm">
                                                    <span className="font-medium">{label}</span> — {a.description}
                                                </p>
                                                <p className="text-xs text-ink-mute">
                                                    {a.browser}
                                                    {a.ip && ` · ${a.ip}`}
                                                </p>
                                            </div>
                                            <time className="shrink-0 text-xs text-ink-mute" dateTime={a.at}>
                                                {when(a.at)}
                                            </time>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                        <Pager paginator={activity} />
                    </Panel>
                )}

                {tab === 'connections' && (
                    <Panel
                        title="Where they sign in from"
                        help="Each line is one internet address + browser combination. The “network” is the wider group of addresses around it — a deep ban blocks the whole network. Lots of different addresses in a short time can mean a shared or stolen account."
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[40rem] text-left text-sm">
                                <thead>
                                    <tr className="text-ink-mute">
                                        {['Internet address', 'Network', 'Browser & device', 'Last used', 'Actions seen'].map((h) => (
                                            <th key={h} scope="col" className="pb-3 font-mono text-[0.65rem] font-normal uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {connections.map((c) => (
                                        <tr key={c.ip + c.browser}>
                                            <td className="py-3 font-mono text-xs">{c.ip}</td>
                                            <td className="font-mono text-xs text-ink-mute">{c.network}</td>
                                            <td>{c.browser}</td>
                                            <td className="text-ink-mute">{when(c.last_seen)}</td>
                                            <td>{c.events}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {connections.length === 0 && <p className="py-8 text-center text-sm text-ink-mute">No connections recorded yet.</p>}
                        </div>
                    </Panel>
                )}

                {tab === 'orders' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Panel title="Recent orders" help="Their latest orders. Open one to change its status.">
                            <ul className="divide-y divide-line">
                                {orders.map((o) => (
                                    <li key={o.number} className="flex items-center gap-3 py-3 text-sm">
                                        <Link href={route('admin.orders.show', o.number)} className="font-mono text-xs underline-offset-4 hover:underline">
                                            {o.number}
                                        </Link>
                                        <span className="flex-1 text-ink-mute">{date(o.placed_at)}</span>
                                        <span className="font-mono text-xs">{money(o.total)}</span>
                                        <OrderStatus status={o.status} label={o.status_label} />
                                    </li>
                                ))}
                                {orders.length === 0 && <li className="py-6 text-center text-sm text-ink-mute">No orders yet.</li>}
                            </ul>
                        </Panel>
                        <Panel title="What they look at most" help="Products this customer spent the most time on. The store uses this to suggest products and give automatic personal discounts.">
                            <ul className="divide-y divide-line">
                                {interests.map((i) => (
                                    <li key={i.slug} className="flex items-center gap-3 py-3 text-sm">
                                        <Link href={route('products.show', i.slug)} className="line-clamp-1 flex-1 hover:underline">
                                            {i.name}
                                        </Link>
                                        <span className="shrink-0 text-xs text-ink-mute">
                                            {i.views} views · {i.minutes} min{i.bought ? ` · bought ${i.bought}×` : ''}
                                        </span>
                                    </li>
                                ))}
                                {interests.length === 0 && <li className="py-6 text-center text-sm text-ink-mute">No browsing recorded yet.</li>}
                            </ul>
                        </Panel>
                    </div>
                )}

                {tab === 'bans' && (
                    <Panel title="Ban history" help="Every ban this customer has had, including lifted and expired ones.">
                        <ul className="space-y-3">
                            {bans.map((b) => (
                                <li key={b.id} className="rounded-3xl border border-line p-4 text-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-medium">{b.label}</span>
                                        <StatusPill tone={b.active ? 'bad' : 'neutral'}>{b.active ? 'Active' : b.lifted_at ? 'Lifted' : 'Expired'}</StatusPill>
                                    </div>
                                    <p className="mt-2 text-ink-soft">“{b.reason}”</p>
                                    <p className="mt-2 text-xs text-ink-mute">
                                        By {b.by ?? 'staff'} on {when(b.created_at)}
                                        {b.expires_at && ` · ends ${when(b.expires_at)}`}
                                        {b.lifted_at && ` · lifted ${when(b.lifted_at)}${b.lifted_by ? ` by ${b.lifted_by}` : ''}`} · {b.identifiers} identifiers blocked
                                    </p>
                                </li>
                            ))}
                            {bans.length === 0 && <li className="py-6 text-center text-sm text-ink-mute">This customer has never been banned.</li>}
                        </ul>
                    </Panel>
                )}
            </div>

            {banning && <BanWizard customer={customer} preview={preview} durations={durations} onClose={() => setBanning(false)} />}
        </AdminLayout>
    );
}

UserPage.layout = (page) => page;

function UsernameEditor({ customer }) {
    const [editing, setEditing] = useState(false);
    const form = useForm({ username: customer.username });
    if (!editing) {
        return (
            <button type="button" onClick={() => setEditing(true)} className="mt-4 text-sm text-ink-mute underline underline-offset-4 hover:text-ink">
                Change username
            </button>
        );
    }
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.patch(route('admin.users.username', customer.id), { preserveScroll: true, onSuccess: () => setEditing(false) });
            }}
            className="mt-4"
        >
            <label htmlFor="username" className="text-xs text-ink-mute">
                New username (lowercase letters, numbers and dashes)
            </label>
            <div className="mt-1 flex gap-2">
                <input id="username" value={form.data.username} onChange={(e) => form.setData('username', e.target.value.toLowerCase())} className="h-10 min-w-0 flex-1 rounded-xl border border-line-strong bg-paper px-3 font-mono text-sm focus:border-ink focus:outline-none" />
                <button type="submit" disabled={form.processing} className="rounded-xl bg-ink px-3 text-sm text-paper">
                    Save
                </button>
                <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-line-strong px-3 text-sm">
                    Cancel
                </button>
            </div>
            {form.errors.username && <p className="mt-1 text-xs text-coral">{form.errors.username}</p>}
        </form>
    );
}

function BanWizard({ customer, preview, durations, onClose }) {
    const [step, setStep] = useState(1);
    const form = useForm({ severity: '', duration: '1w', until: '', reason: '' });
    const level = LEVELS.find((l) => l.key === form.data.severity);
    const counts = preview[form.data.severity] ?? {};
    const countText = Object.entries(counts)
        .map(([k, v]) => `${v} ${{ email: 'email', phone: 'phone number', device: 'device', fingerprint: 'browser', ip: 'internet address', network: 'network' }[k] ?? k}${v === 1 ? '' : 's'}`)
        .join(', ');

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const endText =
        form.data.severity !== 'temporary'
            ? 'with no end date'
            : form.data.duration === 'custom'
              ? form.data.until
                  ? `until ${new Date(form.data.until).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}`
                  : 'until the date you pick'
              : `for ${durations[form.data.duration]}`;

    const submit = () => form.post(route('admin.users.ban', customer.id), { preserveScroll: true, onSuccess: onClose });

    return (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-night/55 p-4 backdrop-blur-sm" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ban-title" className="my-8 w-full max-w-3xl rounded-4xl bg-paper p-6 shadow-2xl md:p-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-mono text-xs uppercase tracking-wider text-ink-mute">Step {step} of 3</p>
                        <h2 id="ban-title" className="mt-2 font-display text-3xl">
                            {step === 1 ? `How serious is it?` : step === 2 ? 'For how long?' : 'Why are you banning them?'}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full border border-line-strong" aria-label="Close">
                        <Icon name="close" size={16} />
                    </button>
                </div>

                {step === 1 && (
                    <div className="mt-6 grid gap-3">
                        {LEVELS.map((l) => {
                            const c = preview[l.key] ?? {};
                            return (
                                <button
                                    key={l.key}
                                    type="button"
                                    onClick={() => {
                                        form.setData('severity', l.key);
                                        setStep(l.key === 'temporary' ? 2 : 3);
                                    }}
                                    className={cn('rounded-3xl border p-5 text-left transition-colors hover:border-ink', form.data.severity === l.key ? 'border-ink bg-card' : 'border-line bg-card/60')}
                                >
                                    <span className="flex items-center justify-between gap-3">
                                        <span className="font-display text-2xl">{l.title}</span>
                                        <StatusPill tone={l.tone}>{l.key === 'temporary' ? 'Ends by itself' : 'Until you lift it'}</StatusPill>
                                    </span>
                                    <span className="mt-2 block text-sm">{l.summary}</span>
                                    <span className="mt-3 block text-sm text-ink-soft">
                                        <strong>Blocks:</strong> {l.blocks}
                                    </span>
                                    <span className="mt-1 block text-sm text-ink-mute">
                                        <strong>Use for:</strong> {l.use}
                                    </span>
                                    <span className="mt-3 block font-mono text-xs text-ink-mute">
                                        For {customer.name.split(' ')[0]}:{' '}
                                        {Object.entries(c)
                                            .map(([k, v]) => `${v} ${k}`)
                                            .join(' · ') || 'account only'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {step === 2 && (
                    <div className="mt-6">
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(durations).map(([key, label]) => (
                                <button key={key} type="button" onClick={() => form.setData('duration', key)} className={cn('rounded-full border px-5 py-3 text-sm', form.data.duration === key ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink')}>
                                    {label}
                                </button>
                            ))}
                            <button type="button" onClick={() => form.setData('duration', 'custom')} className={cn('rounded-full border px-5 py-3 text-sm', form.data.duration === 'custom' ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink')}>
                                Pick a date…
                            </button>
                        </div>
                        {form.data.duration === 'custom' && (
                            <label className="mt-5 block text-sm">
                                Ban ends on
                                <input type="datetime-local" value={form.data.until} onChange={(e) => form.setData('until', e.target.value)} className="mt-2 block h-12 rounded-2xl border border-line-strong bg-card px-4 focus:border-ink focus:outline-none" />
                            </label>
                        )}
                        {(form.errors.duration || form.errors.until) && <p className="mt-2 text-sm text-coral">{form.errors.duration || form.errors.until}</p>}
                        <div className="mt-8 flex justify-between gap-2">
                            <button type="button" onClick={() => setStep(1)} className="rounded-full border border-line-strong px-5 py-3 text-sm">
                                Back
                            </button>
                            <button type="button" onClick={() => setStep(3)} className="rounded-full bg-ink px-5 py-3 text-sm text-paper">
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="mt-6">
                        <div className="flex flex-wrap gap-2">
                            {QUICK_REASONS.map((r) => (
                                <button key={r} type="button" onClick={() => form.setData('reason', r)} className="rounded-full border border-line-strong px-3.5 py-2 text-xs hover:border-ink">
                                    {r}
                                </button>
                            ))}
                        </div>
                        <label htmlFor="ban-reason" className="mt-5 block text-sm font-medium">
                            Reason (only staff see this; the customer sees a general message)
                        </label>
                        <textarea
                            id="ban-reason"
                            value={form.data.reason}
                            onChange={(e) => form.setData('reason', e.target.value)}
                            maxLength={500}
                            className="mt-2 min-h-24 w-full rounded-2xl border border-line-strong bg-card p-3 text-sm focus:border-ink focus:outline-none"
                            placeholder="What happened? Include order or prescription numbers if you have them."
                        />
                        {(form.errors.reason || form.errors.severity) && <p className="mt-1 text-sm text-coral">{form.errors.reason || form.errors.severity}</p>}

                        <div className="mt-6 rounded-3xl border border-coral/30 bg-coral/5 p-5 text-sm leading-relaxed">
                            <p className="font-medium">What will happen</p>
                            <p className="mt-1">
                                {customer.name} will be signed out everywhere right now and get a <strong>{level?.title.toLowerCase()}</strong> {endText}. We will block {countText || 'their account'}
                                {form.data.severity === 'deep' && ' — anyone using those networks will see a “suspended” page instead of the shop'}. You can lift it at any time from this page.
                            </p>
                        </div>

                        <div className="mt-8 flex justify-between gap-2">
                            <button type="button" onClick={() => setStep(form.data.severity === 'temporary' ? 2 : 1)} className="rounded-full border border-line-strong px-5 py-3 text-sm">
                                Back
                            </button>
                            <button type="button" disabled={form.processing || form.data.reason.trim().length < 3} onClick={submit} className="rounded-full bg-coral px-6 py-3 text-sm text-white disabled:opacity-50">
                                Confirm {level?.title.toLowerCase()}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
