import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import RecaptchaCheckbox from '@/Components/forms/RecaptchaCheckbox';
import AuthShell from '@/Components/layout/AuthShell';
import Button from '@/Components/ui/Button';
import Field, { Checkbox, PasswordStrength } from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';

export default function Register() {
    const [captchaReset, setCaptchaReset] = useState(0);
    const form = useForm({ name: '', email: '', password: '', password_confirmation: '', terms: false, recaptcha_token: '' });
    const { data, setData, errors, processing } = form;
    const mismatch = data.password_confirmation.length > 0 && data.password_confirmation !== data.password;

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
            step={['01', '01']}
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
                <Field label="Full name" icon="user" placeholder="e.g. Ayesha Khan" autoComplete="name" maxLength={120} value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} required autoFocus />
                <Field label="Email" type="email" icon="mail" placeholder="you@example.com" autoComplete="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} required />
                <div>
                    <Field label="Password" type="password" icon="lock" placeholder="At least 8 characters" autoComplete="new-password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} required />
                    <PasswordStrength value={data.password} />
                </div>
                <Field
                    label="Confirm password"
                    type="password"
                    icon="lock"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    error={mismatch ? 'Passwords don’t match yet.' : undefined}
                    required
                />
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
