import { Link, useForm } from '@inertiajs/react';
import AuthShell from '@/Components/layout/AuthShell';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import { useRecaptchaV3 } from '@/hooks/useRecaptcha';

export default function ForgotPassword() {
    const getToken = useRecaptchaV3('password_reset');
    const form = useForm({ email: '', recaptcha_token: '' });

    const submit = async (e) => {
        e.preventDefault();
        const token = await getToken();
        form.transform((d) => ({ ...d, recaptcha_token: token ?? '' }));
        form.post(route('password.email'), { preserveScroll: true });
    };

    return (
        <AuthShell
            title="Reset password"
            eyebrow="Account help"
            heading={
                <>
                    Locked out? <span className="italic text-mint">No stress.</span>
                </>
            }
            intro="Enter the email on your account and we'll send a secure link to choose a new password."
            footer={
                <Link href={route('login')} className="inline-flex items-center gap-2 text-ink underline underline-offset-4">
                    <Icon name="arrowLeft" size={14} /> Back to sign in
                </Link>
            }
        >
            <form onSubmit={submit} className="space-y-5" noValidate>
                <Field label="Email" type="email" autoComplete="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email || form.errors.recaptcha_token} required autoFocus />
                <Button type="submit" size="lg" loading={form.processing} className="w-full" icon={<Icon name="mail" size={18} />}>
                    Email me a reset link
                </Button>
            </form>
        </AuthShell>
    );
}
