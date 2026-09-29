import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import FileDrop from '@/Components/forms/FileDrop';
import RecaptchaCheckbox from '@/Components/forms/RecaptchaCheckbox';
import Button from '@/Components/ui/Button';
import Field, { Checkbox } from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';

export default function PrescriptionCreate({ limits }) {
    const { auth } = usePage().props;
    const [captchaReset, setCaptchaReset] = useState(0);
    const form = useForm({
        name: auth.user?.name ?? '',
        email: auth.user?.email ?? '',
        phone: '',
        notes: '',
        file: null,
        consent: false,
        recaptcha_token: '',
    });
    const { data, setData, errors, processing } = form;

    const submit = (e) => {
        e.preventDefault();
        form.post(route('prescriptions.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.reset('notes', 'file', 'consent'),
            // v2 tokens are single-use, so always issue a fresh challenge after a submit.
            onFinish: () => setCaptchaReset((n) => n + 1),
        });
    };

    const steps = [
        ['upload', 'Upload a clear photo or PDF'],
        ['phone', 'A pharmacist calls to confirm'],
        ['truck', 'Delivered, cash on delivery'],
    ];

    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title="Upload prescription">
                <meta name="description" content="Upload your prescription and a licensed Zovita pharmacist will call to confirm medicines and price before delivery." />
            </Head>

            <div className="grid gap-14 lg:grid-cols-12">
                <div className="lg:col-span-5">
                    <p className="eyebrow text-ink-mute">Prescription service</p>
                    <h1 className="mt-4 font-display text-title">
                        Send it. We'll <span className="italic">handle</span> the rest.
                    </h1>
                    <p className="mt-6 max-w-md text-lg text-ink-soft">
                        Your prescription is stored privately and only seen by our pharmacists. We'll call to confirm medicines, substitutes and price — nothing is dispatched without your OK.
                    </p>
                    <ol className="mt-10 space-y-4">
                        {steps.map(([icon, label], i) => (
                            <li key={label} className="flex items-center gap-4">
                                <span className="grid size-12 place-items-center rounded-full bg-mint">
                                    <Icon name={icon} size={20} />
                                </span>
                                <span className="font-mono text-xs text-ink-mute">0{i + 1}</span>
                                <span>{label}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <form onSubmit={submit} className="space-y-6 rounded-5xl bg-card p-6 md:p-10 lg:col-span-7" noValidate>
                    <FileDrop file={data.file} onChange={(f) => setData('file', f)} accept={limits.types} maxMb={limits.max_mb} error={errors.file} />
                    <div className="grid gap-5 md:grid-cols-2">
                        <Field label="Patient / your name" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} autoComplete="name" required />
                        <Field label="Mobile number" type="tel" placeholder="0300 1234567" value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} autoComplete="tel" required />
                        <Field label="Email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} autoComplete="email" className="md:col-span-2" required />
                        <Field as="textarea" label="Notes for the pharmacist" optional placeholder="Quantity, duration, delivery address or anything else we should know" value={data.notes} onChange={(e) => setData('notes', e.target.value)} error={errors.notes} className="md:col-span-2" rows={3} />
                    </div>
                    <Checkbox
                        checked={data.consent}
                        onChange={(e) => setData('consent', e.target.checked)}
                        error={errors.consent}
                        label="I confirm this prescription is valid, issued by a registered doctor, and that I am the patient or authorised by them."
                    />
                    <RecaptchaCheckbox onChange={(token) => setData('recaptcha_token', token)} error={errors.recaptcha_token} resetKey={captchaReset} />
                    <Button type="submit" size="lg" loading={processing} className="w-full" icon={<Icon name="upload" size={18} />}>
                        Send prescription
                    </Button>
                </form>
            </div>
        </section>
    );
}
