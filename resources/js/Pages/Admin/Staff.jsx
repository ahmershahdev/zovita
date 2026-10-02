import { router, useForm } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import Select from '@/Components/ui/Select';
import AdminLayout, { PageGuide, Panel, StatusPill } from '@/Layouts/AdminLayout';
import { date } from '@/lib/format';

/** Owner-only: who works in the admin panel, their role and their two-step sign-in. */
export default function Staff({ staff, roles }) {
    const form = useForm({ email: '', role: 'support' });
    const roleOptions = roles.map((r) => ({ value: r.value, label: r.label }));

    const add = (e) => {
        e.preventDefault();
        form.post(route('admin.staff.store'), { preserveScroll: true, onSuccess: () => form.reset('email') });
    };
    const setRole = (member, role) => {
        if (role === member.role) return;
        router.patch(route('admin.staff.update', member.id), { role }, { preserveScroll: true });
    };
    const remove = (member) => {
        if (!window.confirm(`Remove ${member.name}'s admin access? Their customer account stays.`)) return;
        router.delete(route('admin.staff.destroy', member.id), { preserveScroll: true });
    };
    const resetTwoFactor = (member) => {
        if (!window.confirm(`Reset ${member.name}'s two-step sign-in? They'll get e-mailed sign-in codes until they set up an app again.`)) return;
        router.post(route('admin.staff.reset-2fa', member.id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout title="Staff">
            <PageGuide
                id="staff"
                steps={[
                    'Everyone here can sign in at /admin/login. What they can open depends on their role.',
                    'To add someone, they first create a normal customer account. Then type their e-mail below and pick a role.',
                    'Every sign-in needs a second code: e-mailed to them, or from an authenticator app once they set one up in My security. It can\'t be turned off.',
                    'Lost phone? Use "Reset two-step" so they can set it up again. There must always be at least one owner.',
                ]}
            />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Panel title="Team" description={`${staff.length} ${staff.length === 1 ? 'person' : 'people'} with admin access`} className="xl:col-span-2">
                    <ul className="divide-y divide-line">
                        {staff.map((m) => (
                            <li key={m.id} className="flex flex-wrap items-center gap-4 py-4">
                                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-mint font-display text-lg text-night">{m.name[0]}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium">{m.name}</span>
                                    <span className="block truncate text-xs text-ink-mute">
                                        {m.email} · {m.last_login_at ? `last sign-in ${date(m.last_login_at)}` : 'never signed in'}
                                    </span>
                                </span>
                                <StatusPill tone="good">{m.two_factor ? 'Authenticator app' : 'E-mailed codes'}</StatusPill>
                                <Select variant="pill" ariaLabel={`Role for ${m.name}`} value={m.role} options={roleOptions} onChange={(role) => setRole(m, role)} />
                                <span className="flex gap-2">
                                    {m.two_factor && (
                                        <button type="button" onClick={() => resetTwoFactor(m)} className="rounded-full border border-line-strong px-3 py-1.5 text-xs hover:border-ink">
                                            Reset two-step
                                        </button>
                                    )}
                                    <button type="button" onClick={() => remove(m)} className="rounded-full border border-coral/40 px-3 py-1.5 text-xs text-coral hover:bg-coral hover:text-white">
                                        Remove
                                    </button>
                                </span>
                            </li>
                        ))}
                    </ul>
                </Panel>

                <div className="space-y-6">
                    <Panel title="Add a team member">
                        <form onSubmit={add} className="space-y-4" noValidate>
                            <Field label="Their account e-mail" type="email" icon="mail" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required />
                            <Field as="select" label="Role" value={form.data.role} onChange={(e) => form.setData('role', e.target.value)} error={form.errors.role}>
                                {roles.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </Field>
                            <Button type="submit" loading={form.processing} icon={<Icon name="plus" size={16} />}>
                                Give admin access
                            </Button>
                        </form>
                    </Panel>
                    <Panel title="What each role can do">
                        <dl className="space-y-4 text-sm">
                            {roles.map((r) => (
                                <div key={r.value}>
                                    <dt className="font-medium">{r.label}</dt>
                                    <dd className="text-ink-mute">{r.description}</dd>
                                </div>
                            ))}
                        </dl>
                    </Panel>
                </div>
            </div>
        </AdminLayout>
    );
}

Staff.layout = (page) => page;
