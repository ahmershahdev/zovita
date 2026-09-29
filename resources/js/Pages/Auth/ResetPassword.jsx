import { useForm } from '@inertiajs/react';
import AuthShell from '@/Components/layout/AuthShell';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';

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
            eyebrow="Account help"
            heading={
                <>
                    A fresh <span className="italic text-mint">start.</span>
                </>
            }
            intro="Pick something memorable to you and hard to guess for anyone else."
        >
            <form onSubmit={submit} className="space-y-5" noValidate>
                <Field label="Email" type="email" autoComplete="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} required />
                <Field label="New password" type="password" autoComplete="new-password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} hint="8+ characters with letters and numbers." required autoFocus />
                <Field label="Confirm new password" type="password" autoComplete="new-password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} required />
                <Button type="submit" size="lg" loading={processing} className="w-full">
                    Update password
                </Button>
            </form>
        </AuthShell>
    );
}
