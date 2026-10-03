import { Link, useForm } from '@inertiajs/react';
import { RecaptchaNotice } from '@/Components/forms/RecaptchaCheckbox';
import AuthShell from '@/Components/layout/AuthShell';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import { useRecaptchaV3 } from '@/hooks/useRecaptcha';

/** Passwordless sign-in: we e-mail a one-time 6-digit code that expires in 10 minutes. */
export default function EmailCode() {
    const getToken = useRecaptchaV3('login');
    const form = useForm({ email: '', recaptcha_token: '' });

    const submit = async (e) => {
        e.preventDefault();
        const token = await getToken();
        form.transform((d) => ({ ...d, recaptcha_token: token ?? '' }));
        form.post(route('login.code.send'));
    };

    return (
        <AuthShell
            title="Sign in with an e-mail code"
            step={['01', '02']}
            eyebrow="No password needed"
            heading={
                <>
                    We'll e-mail you a <span className="italic text-mint">code.</span>
                </>
            }
            intro="Enter your account e-mail. If it has an account, we send a 6-digit code that works once and expires in 10 minutes."
            footer={
                <>
                    Prefer your password?{' '}
                    <Link href={route('login')} className="font-medium text-ink underline underline-offset-4">
                        Sign in normally
                    </Link>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-5" noValidate>
                <Field label="Email" type="email" icon="mail" placeholder="you@example.com" autoComplete="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email || form.errors.recaptcha_token} required autoFocus />
                <Button type="submit" size="lg" loading={form.processing} className="w-full" icon={<Icon name="mail" size={18} />}>
                    E-mail me a code
                </Button>
                <RecaptchaNotice className="text-center" />
            </form>
        </AuthShell>
    );
}
