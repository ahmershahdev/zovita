import { useForm } from '@inertiajs/react';
import AuthShell from '@/Components/layout/AuthShell';
import Button from '@/Components/ui/Button';
import Field, { PasswordStrength } from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';

export default function ResetPassword({ token, email }) {
    const form = useForm({ token, email, password: '', password_confirmation: '' });
    const { data, setData, errors, processing } = form;

    const submit = (e) => {
        e.preventDefault();
        form.post(route('password.store'), { onFinish: () => form.reset('password', 'password_confirmation') });
    };

    return (
        <AuthShell
            title="Choose a new password"
            step={['02', '02']}
            eyebrow="Account help"
            heading={
                <>
                    A fresh <span className="italic text-mint">start.</span>
                </>
            }
            intro="Pick something memorable to you and hard to guess for anyone else."
        >
            <form onSubmit={submit} className="space-y-5" noValidate>
                <Field label="Email" type="email" icon="mail" placeholder="you@example.com" autoComplete="email" readOnly={!!email} value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} required />
                <div>
                    <Field label="New password" type="password" icon="lock" placeholder="At least 8 characters" autoComplete="new-password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} required autoFocus />
                    <PasswordStrength value={data.password} />
                </div>
                <Field label="Confirm new password" type="password" icon="lock" placeholder="Re-enter your new password" autoComplete="new-password" error={data.password_confirmation && data.password_confirmation !== data.password ? 'Passwords don’t match yet.' : undefined} value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} required />
                <Button type="submit" size="lg" loading={processing} className="w-full" icon={<Icon name="check" size={18} />}>
                    Update password
                </Button>
            </form>
        </AuthShell>
    );
}
