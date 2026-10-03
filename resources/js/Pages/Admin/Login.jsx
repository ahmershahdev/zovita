import { Head, useForm } from '@inertiajs/react';
import { RecaptchaNotice } from '@/Components/forms/RecaptchaCheckbox';
import Toasts from '@/Components/layout/Toasts';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import ThemeToggle from '@/Components/ui/ThemeToggle';
import { useRecaptchaV3 } from '@/hooks/useRecaptcha';
import { fingerprint } from '@/lib/fingerprint';
import { LocaleSync } from '@/Components/ui/LanguageSwitch';

/** Staff sign-in. Deliberately plain: no store navigation, not linked from the site, noindex. */
export default function AdminLogin() {
    const getToken = useRecaptchaV3('login');
    const form = useForm({ email: '', password: '', remember: false, fp: '', recaptcha_token: '' });

    const submit = async (e) => {
        e.preventDefault();
        const [token, fp] = await Promise.all([getToken(), fingerprint()]);
        form.transform((d) => ({ ...d, fp, recaptcha_token: token ?? '' }));
        form.post(route('admin.login'), { onFinish: () => form.reset('password') });
    };

    return (
        <div className="relative grid min-h-svh place-items-center bg-paper px-4 py-10">
            <Head title="Staff sign-in">
                <meta head-key="robots" name="robots" content="noindex,nofollow" />
            </Head>
            <div className="absolute right-4 top-4">
                <ThemeToggle />
            </div>
            <main id="main" className="w-full max-w-md">
                <form onSubmit={submit} className="rounded-4xl border border-line bg-card p-8 shadow-[0_40px_90px_-40px_rgb(0_0_0/0.35)] md:p-10" noValidate>
                    <span className="grid size-12 place-items-center rounded-2xl bg-night text-mint">
                        <Icon name="lock" size={20} />
                    </span>
                    <h1 className="mt-6 font-display text-4xl">Staff sign-in</h1>
                    <p className="mt-2 text-sm text-ink-mute">
                        For Zovita team members only. Every sign-in is recorded. After 5 wrong attempts this form locks for 15 minutes.
                    </p>
                    <div className="mt-8 space-y-5">
                        <Field
                            label="Work email"
                            type="email"
                            icon="mail"
                            autoComplete="username"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                            error={form.errors.email || form.errors.recaptcha_token}
                            required
                            autoFocus
                        />
                        <Field label="Password" type="password" icon="lock" autoComplete="current-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required />
                    </div>
                    <Button type="submit" size="lg" loading={form.processing} className="mt-8 w-full" icon={<Icon name="arrow" size={18} />}>
                        Sign in to the admin panel
                    </Button>
                    <RecaptchaNotice className="mt-4 text-center" />
                </form>
            </main>
            <Toasts />
        </div>
    );
}

AdminLogin.layout = (page) => (
    <>
        <LocaleSync />
        {page}
    </>
);
