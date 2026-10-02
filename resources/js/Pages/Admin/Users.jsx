import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import AdminLayout, { PageGuide, Pager, Panel, StatusPill } from '@/Layouts/AdminLayout';
import { cn } from '@/lib/cn';
import { date, money } from '@/lib/format';

const FILTERS = [
    ['', 'Everyone'],
    ['active', 'Active today'],
    ['banned', 'Banned'],
    ['admins', 'Staff'],
];

export default function Users({ users, filters }) {
    const [q, setQ] = useState(filters.q ?? '');

    useEffect(() => {
        if (q === (filters.q ?? '')) return undefined;
        const t = setTimeout(() => router.get(route('admin.users.index'), { ...filters, q: q || undefined }, { preserveState: true, replace: true }), 350);
        return () => clearTimeout(t);
    }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AdminLayout title="Customers">
            <PageGuide
                id="users"
                steps={[
                    'Type a name, email, phone number or @username in the search box to find someone.',
                    'Use the buttons to show only banned customers, staff, or people active today.',
                    'Press “Open” to see everything about a customer: their orders, sign-ins and activity.',
                    'Banning and lifting bans happens on the customer’s own page, step by step.',
                ]}
            />
            <Panel>
                <div className="mb-6 flex flex-wrap items-center gap-3">
                    <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full border border-line-strong bg-paper px-4 sm:max-w-md">
                        <Icon name="search" size={16} className="text-ink-mute" />
                        <span className="sr-only">Search customers</span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone or @username" className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
                    </label>
                    <div className="scrollbar-none flex overflow-x-auto rounded-full border border-line p-1 text-sm" role="group" aria-label="Filter">
                        {FILTERS.map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={(filters.filter ?? '') === value}
                                onClick={() => router.get(route('admin.users.index'), { ...filters, filter: value || undefined }, { preserveState: true })}
                                className={cn('shrink-0 rounded-full px-4 py-2', (filters.filter ?? '') === value ? 'bg-ink text-paper' : 'text-ink-mute hover:text-ink')}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {users.data.map((u) => (
                        <li key={u.id} className={cn('flex items-center gap-4 rounded-3xl border p-4', u.banned ? 'border-coral/30 bg-coral/5' : 'border-line')}>
                            {u.avatar ? (
                                <img src={u.avatar} alt="" className="size-12 shrink-0 rounded-full object-cover" />
                            ) : (
                                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-mint font-display text-lg text-night">{u.name[0]}</span>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{u.name}</p>
                                <p className="truncate text-xs text-ink-mute">
                                    <span translate="no" className="font-mono">
                                        @{u.username}
                                    </span>{' '}
                                    · {u.email}
                                </p>
                                <p className="mt-1 text-xs text-ink-mute">
                                    {u.orders} orders · {money(u.spent)} · joined {date(u.joined)}
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                                {u.banned ? (
                                    <StatusPill tone="bad">
                                        <Icon name="lock" size={11} /> {u.banned_until ? `Banned until ${date(u.banned_until)}` : 'Banned'}
                                    </StatusPill>
                                ) : u.is_admin ? (
                                    <StatusPill tone="good">
                                        <Icon name="shield" size={11} /> Staff
                                    </StatusPill>
                                ) : (
                                    <StatusPill>Active</StatusPill>
                                )}
                                <Link href={route('admin.users.show', u.id)} className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-xs text-paper">
                                    Open <Icon name="arrow" size={12} />
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
                {!users.data.length && <p className="py-12 text-center text-sm text-ink-mute">No customers match. Try a shorter search.</p>}
                <Pager paginator={users} />
            </Panel>
        </AdminLayout>
    );
}

Users.layout = (page) => page;
