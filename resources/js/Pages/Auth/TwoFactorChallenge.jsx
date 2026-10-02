import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AuthShell from '@/Components/layout/AuthShell';
import Toasts from '@/Components/layout/Toasts';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import ThemeToggle from '@/Components/ui/ThemeToggle';
import StoreLayout from '@/Layouts/StoreLayout';

/**
 * Second sign-in step: a code from the authenticator app ("totp"), or a one-time 6-digit code we
 * e-mailed ("email"). Authenticator users can switch to a single-use recovery code.
 */
function CodeForm({ action, resend, cancel, staff, method, email, minutes }) {
    const [recovery, setRecovery] = useState(false);
    const form = useForm({ code: '' });
    const byEmail = method === 'email';

    const submit = (e) => {
        e.preventDefault();
        form.post(action, { onError: () => form.reset('code') });
    };

    return (
        <form onSubmit={submit} className="space-y-5" noValidate>
            {recovery ? (
                <Field label="Recovery code" icon="lock" placeholder="ABCDE-FGHIJ" autoComplete="one-time-code" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} error={form.errors.code} required autoFocus />
            ) : (
                <Field
                    label={byEmail ? 'Code from your e-mail' : '6-digit code'}
                    icon={byEmail ? 'mail' : 'lock'}
                    inputMode="numeric"
                    pattern="[0-9 ]*"
                    maxLength={7}
                    placeholder="123 456"
                    autoComplete="one-time-code"
                    value={form.data.code}
                    onChange={(e) => form.setData('code', e.target.value)}
                    error={form.errors.code}
                    hint={byEmail ? `We sent a 6-digit code to ${email}. It works once and expires in ${minutes} minutes.` : 'Open your authenticator app and type the code shown for Zovita.'}
                    required
                    autoFocus
                />
            )}
            <Button type="submit" size="lg" loading={form.processing} className="w-full" icon={<Icon name="arrow" size={18} />}>
                {staff ? 'Verify and open the admin panel' : 'Verify and sign in'}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                {byEmail ? (
                    <button type="button" onClick={() => router.post(resend, {}, { preserveScroll: true })} className="text-ink-mute underline underline-offset-4 hover:text-ink">
                        Send me a new code
                    </button>
                ) : (
                    <button type="button" onClick={() => { setRecovery((r) => !r); form.reset('code'); form.clearErrors(); }} className="text-ink-mute underline underline-offset-4 hover:text-ink">
                        {recovery ? 'Use my authenticator app instead' : 'Lost your phone? Use a recovery code'}
                    </button>
                )}
                <Link href={cancel} className="text-ink-mute hover:text-ink">
                    Start again
                </Link>
            </div>
        </form>
    );
}

export default function TwoFactorChallenge(props) {
    const { staff, method } = props;
    const byEmail = method === 'email';

    if (staff) {
        return (
            <div className="relative grid min-h-svh place-items-center bg-paper px-4 py-10">
                <Head title="Two-step sign-in">
                    <meta head-key="robots" name="robots" content="noindex,nofollow" />
                </Head>
                <div className="absolute right-4 top-4">
                    <ThemeToggle />
                </div>
                <main id="main" className="w-full max-w-md rounded-4xl border border-line bg-card p-8 shadow-[0_40px_90px_-40px_rgb(0_0_0/0.35)] md:p-10">
                    <span className="grid size-12 place-items-center rounded-2xl bg-night text-mint">
                        <Icon name={byEmail ? 'mail' : 'shield'} size={20} />
                    </span>
                    <h1 className="mt-6 font-display text-4xl">{byEmail ? 'Check your e-mail' : 'Two-step sign-in'}</h1>
                    <p className="mb-8 mt-2 text-sm text-ink-mute">
                        {byEmail
                            ? 'Your password was right. Enter the code we just e-mailed you. You can switch to an authenticator app later in My security.'
                            : 'Your password was right. Now confirm it\'s really you with your authenticator app.'}{' '}
                        After 5 wrong codes you'll need your password again.
                    </p>
                    <CodeForm {...props} />
                </main>
                <Toasts />
            </div>
        );
    }

    return (
        <AuthShell
            title={byEmail ? 'Check your e-mail' : 'Two-step sign-in'}
            step={['02', '02']}
            eyebrow="One more step"
            heading={
                <>
                    Just checking it's <span className="italic text-mint">you.</span>
                </>
            }
            intro={byEmail ? 'Enter the code we e-mailed you to finish signing in.' : 'You turned on two-step sign-in, so we need the code from your authenticator app as well.'}
        >
            <CodeForm {...props} />
        </AuthShell>
    );
}

// Staff get the bare admin-style screen; customers keep the store chrome.
TwoFactorChallenge.layout = (page) => (page.props.staff ? page : <StoreLayout>{page}</StoreLayout>);
