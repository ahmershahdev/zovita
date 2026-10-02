import { Link, useForm } from '@inertiajs/react';
import AuthShell from '@/Components/layout/AuthShell';
import { fingerprint } from '@/lib/fingerprint';
import Button from '@/Components/ui/Button';
import Field, { Checkbox } from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import { useRecaptchaV3 } from '@/hooks/useRecaptcha';
import { RecaptchaNotice } from '@/Components/forms/RecaptchaCheckbox';

export default function Login() {
    const getToken = useRecaptchaV3('login');
    const form = useForm({ email: '', password: '', remember: true, recaptcha_token: '' });
    const { data, setData, errors, processing } = form;

    const submit = async (e) => {
        e.preventDefault();
        const token = await getToken();
        const fp = await fingerprint();
        form.transform((d) => ({ ...d, fp, recaptcha_token: token ?? '' }));
        form.post(route('login'), { onFinish: () => form.reset('password') });
    };

    return (
        <AuthShell
            title="Sign in"
            step={['01', '01']}
            eyebrow="Welcome back"
            heading={
                <>
                    Good to see you <span className="italic text-mint">again.</span>
                </>
            }
            intro="Track orders, re-order essentials and keep your prescriptions in one calm place."
            footer={
                <>
                    New to Zovita?{' '}
                    <Link href={route('register')} className="font-medium text-ink underline underline-offset-4">
                        Create an account
                    </Link>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-5" noValidate>
                <Field label="Email" type="email" icon="mail" placeholder="you@example.com" autoComplete="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email || errors.recaptcha_token} required autoFocus />
                <Field label="Password" type="password" icon="lock" placeholder="Enter your password" autoComplete="current-password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} required />
                <div className="flex items-center justify-between">
                    <Checkbox label="Keep me signed in" checked={data.remember} onChange={(e) => setData('remember', e.target.checked)} />
                    <Link href={route('password.request')} className="text-sm text-ink-mute underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink">
                        Forgot password?
                    </Link>
                </div>
                <Button type="submit" size="lg" loading={processing} className="w-full" icon={<Icon name="arrow" size={18} />}>
                    Sign in
                </Button>
                <RecaptchaNotice className="text-center" />
            </form>
        </AuthShell>
    );
}
