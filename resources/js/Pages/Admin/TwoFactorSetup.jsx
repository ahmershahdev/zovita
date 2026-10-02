import { Head, Link, useForm } from '@inertiajs/react';
import Toasts from '@/Components/layout/Toasts';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import ThemeToggle from '@/Components/ui/ThemeToggle';

/**
 * Mandatory for staff: shown after a correct staff password when two-step sign-in isn't set up.
 * Nothing in the panel opens until the authenticator app produces a valid code.
 */
export default function TwoFactorSetup({ name, qr, secret }) {
    const form = useForm({ code: '' });
    const submit = (e) => {
        e.preventDefault();
        form.post(route('admin.two-factor.setup.store'), { onError: () => form.reset('code') });
    };

    return (
        <div className="relative grid min-h-svh place-items-center bg-paper px-4 py-10">
            <Head title="Set up two-step sign-in">
                <meta head-key="robots" name="robots" content="noindex,nofollow" />
            </Head>
            <div className="absolute right-4 top-4">
                <ThemeToggle />
            </div>
            <main id="main" className="w-full max-w-2xl rounded-4xl border border-line bg-card p-6 shadow-[0_40px_90px_-40px_rgb(0_0_0/0.35)] md:p-10">
                <span className="grid size-12 place-items-center rounded-2xl bg-night text-mint">
                    <Icon name="shield" size={20} />
                </span>
                <h1 className="mt-6 font-display text-4xl">Set up two-step sign-in</h1>
                <p className="mt-2 text-sm text-ink-mute">
                    Hi {name}. Everyone who works in the admin panel signs in with a password <em>and</em> a code from their phone, so a stolen password alone can't open it. This takes about a minute.
                </p>

                <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr]">
                    <li className="rounded-3xl bg-white p-4 md:row-span-3">
                        <div className="size-[200px] max-w-full [&_svg]:h-full [&_svg]:w-full" role="img" aria-label="QR code for your authenticator app" dangerouslySetInnerHTML={{ __html: qr }} />
                    </li>
                    <li className="text-sm leading-relaxed">
                        <p className="font-medium">1. Install an authenticator app</p>
                        <p className="text-ink-mute">Google Authenticator, Microsoft Authenticator, 1Password or any app that supports "TOTP".</p>
                    </li>
                    <li className="text-sm leading-relaxed">
                        <p className="font-medium">2. Scan the QR code</p>
                        <p className="text-ink-mute">Can't scan? Choose "enter a setup key" and type:</p>
                        <code className="mt-2 block select-all break-all rounded-xl bg-paper-deep px-3 py-2 font-mono text-sm tracking-wider" data-testid="totp-secret">{secret}</code>
                    </li>
                    <li>
                        <form onSubmit={submit} noValidate>
                            <p className="mb-3 text-sm font-medium">3. Type the 6-digit code the app shows</p>
                            <Field label="6-digit code" icon="lock" inputMode="numeric" maxLength={7} placeholder="123 456" autoComplete="one-time-code" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} error={form.errors.code} required autoFocus />
                            <Button type="submit" size="lg" loading={form.processing} className="mt-5 w-full" icon={<Icon name="arrow" size={18} />}>
                                Turn on and continue
                            </Button>
                        </form>
                    </li>
                </ol>
                <p className="mt-8 text-xs text-ink-mute">
                    Not you, or want to stop? <Link href={route('admin.login')} className="underline underline-offset-4">Back to staff sign-in</Link>
                </p>
            </main>
            <Toasts />
        </div>
    );
}

TwoFactorSetup.layout = (page) => page;
