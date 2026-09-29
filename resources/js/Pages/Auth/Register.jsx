import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import RecaptchaCheckbox from '@/Components/forms/RecaptchaCheckbox';
import AuthShell from '@/Components/layout/AuthShell';
import Button from '@/Components/ui/Button';
import Field, { Checkbox } from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';

export default function Register() {
    const [captchaReset, setCaptchaReset] = useState(0);
    const form = useForm({ name: '', email: '', password: '', password_confirmation: '', terms: false, recaptcha_token: '' });
    const { data, setData, errors, processing } = form;

    const submit = (e) => {
        e.preventDefault();
        form.post(route('register'), {
            onError: () => setCaptchaReset((n) => n + 1),
            onFinish: () => form.reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthShell
            title="Create account"
            eyebrow="Join Zovita"
            heading={
                <>
                    Care, made <span className="italic text-mint">personal.</span>
                </>
            }
            intro="Save addresses, track every order and keep your prescriptions ready for next time."
            footer={
                <>
                    Already have an account?{' '}
                    <Link href={route('login')} className="font-medium text-ink underline underline-offset-4">
                        Sign in
                    </Link>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-5" noValidate>
                <Field label="Full name" autoComplete="name" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} required autoFocus />
                <Field label="Email" type="email" autoComplete="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} required />
                <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Password" type="password" autoComplete="new-password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} hint="8+ characters with letters and numbers." required />
                    <Field label="Confirm password" type="password" autoComplete="new-password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} required />
                </div>
                <Checkbox
                    checked={data.terms}
                    onChange={(e) => setData('terms', e.target.checked)}
                    error={errors.terms}
                    label={
                        <>
                            I agree to the{' '}
                            <Link href={route('legal', 'terms')} className="underline">
                                terms
                            </Link>{' '}
                            and{' '}
                            <Link href={route('legal', 'privacy')} className="underline">
                                privacy policy
                            </Link>
                            .
                        </>
                    }
                />
                <RecaptchaCheckbox onChange={(token) => setData('recaptcha_token', token)} error={errors.recaptcha_token} resetKey={captchaReset} />
                <Button type="submit" size="lg" loading={processing} className="w-full" icon={<Icon name="arrow" size={18} />}>
                    Create account
                </Button>
            </form>
        </AuthShell>
    );
}
