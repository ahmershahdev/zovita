import { Link, useForm } from '@inertiajs/react';
import AuthShell from '@/Components/layout/AuthShell';
import Button from '@/Components/ui/Button';
import Field, { Checkbox } from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import { useRecaptchaV3 } from '@/hooks/useRecaptcha';

export default function Login() {
    const getToken = useRecaptchaV3('login');
    const form = useForm({ email: '', password: '', remember: true, recaptcha_token: '' });
    const { data, setData, errors, processing } = form;

    const submit = async (e) => {
        e.preventDefault();
        const token = await getToken();
        form.transform((d) => ({ ...d, recaptcha_token: token ?? '' }));
        form.post(route('login'), { onFinish: () => form.reset('password') });
    };

    return (
        <AuthShell
            title="Sign in"
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
                <Field label="Email" type="email" autoComplete="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email || errors.recaptcha_token} required autoFocus />
                <Field label="Password" type="password" autoComplete="current-password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} required />
                <div className="flex items-center justify-between">
                    <Checkbox label="Keep me signed in" checked={data.remember} onChange={(e) => setData('remember', e.target.checked)} />
                    <Link href={route('password.request')} className="text-sm underline underline-offset-4">
                        Forgot password?
                    </Link>
                </div>
                <Button type="submit" size="lg" loading={processing} className="w-full" icon={<Icon name="arrow" size={18} />}>
                    Sign in
                </Button>
                <p className="text-center text-xs text-ink-mute">Protected by reCAPTCHA v3.</p>
            </form>
        </AuthShell>
    );
}
