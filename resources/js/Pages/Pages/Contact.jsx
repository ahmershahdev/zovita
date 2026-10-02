import { Head, useForm, usePage } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import { useRecaptchaV3 } from '@/hooks/useRecaptcha';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';
import { RecaptchaNotice } from '@/Components/forms/RecaptchaCheckbox';
import StoreMap from '@/Components/layout/StoreMap';

export default function Contact({ topics }) {
    const { app, auth } = usePage().props;
    const getToken = useRecaptchaV3('contact');
    const form = useForm({ name: auth.user?.name ?? '', email: auth.user?.email ?? '', phone: '', topic: topics[0], message: '', website: '', recaptcha_token: '' });
    const { data, setData, errors, processing } = form;

    const submit = async (e) => {
        e.preventDefault();
        const token = await getToken();
        form.transform((d) => ({ ...d, recaptcha_token: token ?? '' }));
        form.post(route('contact.store'), { preserveScroll: true, onSuccess: () => form.reset('message', 'phone') });
    };

    const phoneDigits = app.support.phone.replace(/[^\d+]/g, '');
    const channels = [
        ['phone', 'Call us', app.support.phone, `tel:${phoneDigits}`],
        ['whatsapp', 'WhatsApp', app.support.phone, `https://wa.me/${phoneDigits.replace('+', '')}`],
        ['mail', 'Email', app.support.email, `mailto:${app.support.email}`],
        ['clock', 'Hours', app.support.hours, null],
    ];
    const { author } = app;
    const social = [
        ['globe', 'Portfolio', author.website],
        ['linkedin', 'LinkedIn', author.linkedin],
        ['github', 'GitHub', author.github],
        ['code', 'Source code', author.source],
    ];

    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title="Contact us">
                <meta head-key="description" name="description" content="Reach Zovita's care team for order updates, prescription help and product questions." />
            </Head>
            <Breadcrumbs items={[{ label: 'Contact' }]} className="mb-6" />
            <div className="grid gap-14 lg:grid-cols-12">
                <div className="lg:col-span-5">
                    <p className="eyebrow text-ink-mute">Contact</p>
                    <h1 className="mt-4 font-display text-title">
                        Real people, <span className="italic">real care.</span>
                    </h1>
                    <p className="mt-6 max-w-md text-lg text-ink-soft">Questions about an order, a prescription or a product? Our care team and pharmacists usually reply within one business day.</p>
                    <ul className="mt-10 divide-y divide-line border-y border-line">
                        {channels.map(([icon, label, value, href]) => (
                            <li key={label} className="flex items-center gap-4 py-5">
                                <span className="grid size-12 place-items-center rounded-full bg-mint">
                                    <Icon name={icon} size={20} />
                                </span>
                                <span>
                                    <span className="eyebrow block text-ink-mute">{label}</span>
                                    {href ? (
                                        <a
                                            href={href}
                                            target={href.startsWith('http') ? '_blank' : undefined}
                                            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                            className="text-lg hover:underline"
                                        >
                                            {value}
                                        </a>
                                    ) : (
                                        <span className="text-lg">{value}</span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="eyebrow mt-10 text-ink-mute">Built by {author.name}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {social.map(([icon, label, href]) => (
                            <a
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm transition hover:border-ink hover:bg-ink hover:text-paper"
                            >
                                <Icon name={icon} size={16} /> {label}
                            </a>
                        ))}
                    </div>
                </div>

                <form onSubmit={submit} className="grid gap-5 rounded-5xl bg-card p-6 md:grid-cols-2 md:p-10 lg:col-span-7" noValidate>
                    <Field label="Full name" placeholder="e.g. Ayesha Khan" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} autoComplete="name" required />
                    <Field label="Email" placeholder="you@example.com" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} autoComplete="email" required />
                    <Field label="Phone" placeholder="03XX XXXXXXX" type="tel" optional value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} autoComplete="tel" />
                    <Field as="select" label="Topic" value={data.topic} onChange={(e) => setData('topic', e.target.value)} error={errors.topic}>
                        {topics.map((t) => (
                            <option key={t}>{t}</option>
                        ))}
                    </Field>
                    <Field as="textarea" label="Message" placeholder="How can our pharmacists help you today?" rows={6} value={data.message} onChange={(e) => setData('message', e.target.value)} error={errors.message} hint="Include your order number if it's about an order." className="md:col-span-2" required />
                    {/* Honeypot — hidden from people, tempting to bots */}
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={data.website} onChange={(e) => setData('website', e.target.value)} className="hidden" aria-hidden="true" />
                    {errors.recaptcha_token && <p className="text-sm text-coral md:col-span-2">{errors.recaptcha_token}</p>}
                    <div className="flex flex-wrap items-center justify-between gap-4 md:col-span-2">
                        <RecaptchaNotice />
                        <Button type="submit" size="lg" loading={processing} icon={<Icon name="arrow" size={18} />}>
                            Send message
                        </Button>
                    </div>
                </form>
            </div>

            <StoreMap className="mt-16" />
        </section>
    );
}
