import { useForm } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import AdminLayout, { Panel, StatusPill } from '@/Layouts/AdminLayout';
import { date } from '@/lib/format';

/** A staff member's own role and two-step sign-in, plus recovery codes (shown once). */
export default function Security({ role, twoFactor, recoveryCodes }) {
    const form = useForm({ code: '' });
    const regenerate = (e) => {
        e.preventDefault();
        form.post(route('admin.security.recovery'), { preserveScroll: true, onFinish: () => form.reset('code') });
    };

    return (
        <AdminLayout title="My security">
            {recoveryCodes?.length > 0 && (
                <section className="mb-6 rounded-4xl border-2 border-teal bg-mint-soft p-6" aria-label="Recovery codes" data-testid="recovery-codes">
                    <h2 className="font-display text-2xl">Save these recovery codes now</h2>
                    <p className="mt-1 text-sm text-ink-soft">Each one signs you in once if you lose your phone. They won't be shown again. Store them in a password manager or print them.</p>
                    <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
                        {recoveryCodes.map((c) => (
                            <li key={c} className="select-all rounded-xl bg-paper px-3 py-2 text-center">
                                {c}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Panel title="Your role">
                    <p className="font-display text-3xl">{role.label}</p>
                    <p className="mt-1 text-sm text-ink-mute">{role.description}</p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                        {role.permissions.map((p) => (
                            <li key={p} className="rounded-full bg-paper-deep px-3 py-1 font-mono text-xs">
                                {p}
                            </li>
                        ))}
                    </ul>
                </Panel>
                <Panel title="Two-step sign-in" help="Required for everyone with admin access. Your password and a code from your phone are both needed to open the panel.">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                        <StatusPill tone="good">On</StatusPill>
                        {twoFactor.since && <span className="text-ink-mute">since {date(twoFactor.since)}</span>}
                    </p>
                    <p className="mt-3 text-sm">
                        {twoFactor.recovery_left} recovery {twoFactor.recovery_left === 1 ? 'code' : 'codes'} left.
                    </p>
                    <form onSubmit={regenerate} className="mt-5 space-y-3 border-t border-line pt-5" noValidate>
                        <p className="text-sm text-ink-mute">New codes replace the old ones. Confirm with a code from your app.</p>
                        <Field label="6-digit code" inputMode="numeric" maxLength={7} autoComplete="one-time-code" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} error={form.errors.code} />
                        <Button type="submit" variant="ghost" size="sm" loading={form.processing}>
                            Make new recovery codes
                        </Button>
                    </form>
                </Panel>
            </div>
        </AdminLayout>
    );
}

Security.layout = (page) => page;
