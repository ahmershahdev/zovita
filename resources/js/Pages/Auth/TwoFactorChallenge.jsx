import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AuthShell from '@/Components/layout/AuthShell';
import Toasts from '@/Components/layout/Toasts';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import ThemeToggle from '@/Components/ui/ThemeToggle';
import StoreLayout from '@/Layouts/StoreLayout';

/** Second sign-in step: a 6-digit code from the authenticator app, or a one-time recovery code. */
function CodeForm({ action, cancel, staff }) {
    const [recovery, setRecovery] = useState(false);
    const form = useForm({ code: '' });

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
                    label="6-digit code"
                    icon="lock"
                    inputMode="numeric"
                    pattern="[0-9 ]*"
                    maxLength={7}
                    placeholder="123 456"
                    autoComplete="one-time-code"
                    value={form.data.code}
                    onChange={(e) => form.setData('code', e.target.value)}
                    error={form.errors.code}
                    hint="Open your authenticator app and type the code shown for Zovita."
                    required
                    autoFocus
                />
            )}
            <Button type="submit" size="lg" loading={form.processing} className="w-full" icon={<Icon name="arrow" size={18} />}>
                {staff ? 'Verify and open the admin panel' : 'Verify and sign in'}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <button type="button" onClick={() => { setRecovery((r) => !r); form.reset('code'); form.clearErrors(); }} className="text-ink-mute underline underline-offset-4 hover:text-ink">
                    {recovery ? 'Use my authenticator app instead' : 'Lost your phone? Use a recovery code'}
                </button>
                <Link href={cancel} className="text-ink-mute hover:text-ink">
                    Start again
                </Link>
            </div>
        </form>
    );
}

export default function TwoFactorChallenge({ staff, action, cancel }) {
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
                        <Icon name="shield" size={20} />
                    </span>
                    <h1 className="mt-6 font-display text-4xl">Two-step sign-in</h1>
                    <p className="mb-8 mt-2 text-sm text-ink-mute">Your password was right. Now confirm it's really you with your authenticator app. After 5 wrong codes you'll need your password again.</p>
                    <CodeForm action={action} cancel={cancel} staff />
                </main>
                <Toasts />
            </div>
        );
    }

    return (
        <AuthShell
            title="Two-step sign-in"
            step={['02', '02']}
            eyebrow="One more step"
            heading={
                <>
                    Just checking it's <span className="italic text-mint">you.</span>
                </>
            }
            intro="You turned on two-step sign-in, so we need the code from your authenticator app as well as your password."
        >
            <CodeForm action={action} cancel={cancel} />
        </AuthShell>
    );
}

// Staff get the bare admin-style screen; customers keep the store chrome.
TwoFactorChallenge.layout = (page) => (page.props.staff ? page : <StoreLayout>{page}</StoreLayout>);
