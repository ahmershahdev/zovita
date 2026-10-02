import { router, useForm } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import AdminLayout, { PageGuide, Panel, StatusPill } from '@/Layouts/AdminLayout';
import { date } from '@/lib/format';

/** A staff member's own sign-in security: e-mailed codes by default, an authenticator app once set up. */
export default function Security({ role, twoFactor, email, recoveryCodes }) {
    const confirm = useForm({ code: '' });
    const regen = useForm({ code: '' });
    const off = useForm({ code: '' });

    return (
        <AdminLayout title="My security">
            <PageGuide
                id="security"
                steps={[
                    'Every admin sign-in needs your password plus a second code. Nobody gets in with a password alone.',
                    `Until you set up an authenticator app, that code is e-mailed to ${email} and expires after 10 minutes.`,
                    'An authenticator app (Google Authenticator, Microsoft Authenticator, 1Password) is faster and works without e-mail. Set it up below.',
                    'Keep the recovery codes somewhere safe: each signs you in once if you lose your phone.',
                ]}
            />
            {recoveryCodes?.length > 0 && (
                <section className="mb-6 rounded-4xl border-2 border-teal bg-mint-soft p-6" aria-label="Recovery codes" data-testid="recovery-codes">
                    <h2 className="font-display text-2xl">Save these recovery codes now</h2>
                    <p className="mt-1 text-sm text-ink-soft">Each one signs you in once if you lose your phone. They won't be shown again.</p>
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
                <Panel title="Second sign-in step" help="Required for everyone with admin access.">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                        <StatusPill tone="good">{twoFactor.enabled ? 'Authenticator app' : 'E-mailed codes'}</StatusPill>
                        {twoFactor.enabled && twoFactor.since && <span className="text-ink-mute">since {date(twoFactor.since)}</span>}
                    </p>

                    {!twoFactor.enabled && !twoFactor.setup && (
                        <div className="mt-5">
                            <p className="text-sm text-ink-mute">Codes currently go to {email}.</p>
                            <Button className="mt-4" onClick={() => router.post(route('admin.security.authenticator.start'), {}, { preserveScroll: true })} icon={<Icon name="shield" size={16} />}>
                                Set up an authenticator app
                            </Button>
                        </div>
                    )}

                    {twoFactor.setup && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                confirm.post(route('admin.security.authenticator.confirm'), { preserveScroll: true, onError: () => confirm.reset('code') });
                            }}
                            className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr]"
                            noValidate
                        >
                            <div className="size-[180px] max-w-full rounded-2xl bg-white p-3 [&_svg]:h-full [&_svg]:w-full" role="img" aria-label="QR code for your authenticator app" dangerouslySetInnerHTML={{ __html: twoFactor.setup.qr }} />
                            <div className="min-w-0 space-y-3 text-sm">
                                <p>1. Scan the QR code with your authenticator app.</p>
                                <p>
                                    Can't scan? Enter this key:
                                    <code className="mt-1 block select-all break-all rounded-xl bg-paper-deep px-3 py-2 font-mono" data-testid="totp-secret">{twoFactor.setup.secret}</code>
                                </p>
                                <Field label="2. Type the 6-digit code" inputMode="numeric" maxLength={7} autoComplete="one-time-code" value={confirm.data.code} onChange={(e) => confirm.setData('code', e.target.value)} error={confirm.errors.code} />
                                <div className="flex flex-wrap gap-3">
                                    <Button type="submit" size="sm" loading={confirm.processing}>
                                        Turn on
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => router.delete(route('admin.security.authenticator.cancel'), { preserveScroll: true })}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </form>
                    )}

                    {twoFactor.enabled && (
                        <div className="mt-5 space-y-6 border-t border-line pt-5">
                            <p className="text-sm">
                                {twoFactor.recovery_left} recovery {twoFactor.recovery_left === 1 ? 'code' : 'codes'} left.
                            </p>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    regen.post(route('admin.security.recovery'), { preserveScroll: true, onFinish: () => regen.reset('code') });
                                }}
                                className="space-y-3"
                                noValidate
                            >
                                <Field label="App code (to make new recovery codes)" inputMode="numeric" maxLength={7} autoComplete="one-time-code" value={regen.data.code} onChange={(e) => regen.setData('code', e.target.value)} error={regen.errors.code} />
                                <Button type="submit" variant="ghost" size="sm" loading={regen.processing}>
                                    Make new recovery codes
                                </Button>
                            </form>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    off.delete(route('admin.security.authenticator.destroy'), { preserveScroll: true, onFinish: () => off.reset('code') });
                                }}
                                className="space-y-3"
                                noValidate
                            >
                                <Field label="App code (to switch back to e-mailed codes)" inputMode="numeric" maxLength={7} autoComplete="one-time-code" value={off.data.code} onChange={(e) => off.setData('code', e.target.value)} error={off.errors.disable_code || off.errors.code} />
                                <Button type="submit" variant="danger" size="sm" loading={off.processing}>
                                    Remove authenticator app
                                </Button>
                            </form>
                        </div>
                    )}
                </Panel>
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
            </div>
        </AdminLayout>
    );
}

Security.layout = (page) => page;
