import { Link, useForm, usePage } from '@inertiajs/react';
import Magnetic from '@/Components/motion/Magnetic';
import Icon from '@/Components/ui/Icon';
import { useRecaptchaV3 } from '@/hooks/useRecaptcha';

const columns = [
    {
        title: 'Shop',
        links: [
            ['Medicines', () => route('shop.department', 'medicines')],
            ['Vitamins & Supplements', () => route('shop.department', 'vitamins-supplements')],
            ['Skin & Derma', () => route('shop.department', 'skin-care')],
            ['Mother & Baby', () => route('shop.department', 'mother-baby')],
            ['Health Devices', () => route('shop.department', 'health-devices')],
        ],
    },
    {
        title: 'Care',
        links: [
            ['Upload prescription', () => route('prescriptions.create')],
            ['Track your order', () => route('orders.track')],
            ['FAQ', () => route('faq')],
            ['Contact us', () => route('contact')],
        ],
    },
    {
        title: 'Company',
        links: [
            ['About Zovita', () => route('about')],
            ['Shipping', () => route('legal', 'shipping')],
            ['Returns & refunds', () => route('legal', 'returns')],
            ['Privacy', () => route('legal', 'privacy')],
            ['Terms', () => route('legal', 'terms')],
        ],
    },
];

function Newsletter() {
    const getToken = useRecaptchaV3('newsletter', { preload: false });
    const form = useForm({ email: '', recaptcha_token: '' });

    const submit = async (e) => {
        e.preventDefault();
        const token = await getToken();
        form.transform((data) => ({ ...data, recaptcha_token: token ?? '' }));
        form.post(route('newsletter.store'), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <form onSubmit={submit} className="w-full max-w-md">
            <label htmlFor="newsletter-email" className="eyebrow text-mint">
                Wellness notes, monthly
            </label>
            <div className="mt-4 flex items-center gap-2 border-b border-paper/30 pb-3 focus-within:border-mint">
                <input
                    id="newsletter-email"
                    type="email"
                    required
                    value={form.data.email}
                    onChange={(e) => form.setData('email', e.target.value)}
                    placeholder="you@email.com"
                    className="min-w-0 flex-1 bg-transparent text-lg text-paper placeholder:text-paper/40 focus:outline-none"
                />
                <button type="submit" disabled={form.processing} className="grid size-11 place-items-center rounded-full bg-mint text-ink transition hover:scale-105 disabled:opacity-50" aria-label="Subscribe">
                    <Icon name="arrow" size={18} />
                </button>
            </div>
            {(form.errors.email || form.errors.recaptcha_token) && (
                <p className="mt-2 text-sm text-coral">{form.errors.email || form.errors.recaptcha_token}</p>
            )}
            <p className="mt-3 text-xs text-paper/50">Protected by reCAPTCHA. Google's Privacy Policy and Terms apply.</p>
        </form>
    );
}

const underline =
    'absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-mint transition-transform duration-500 group-hover:origin-left group-hover:scale-x-100';

export default function Footer() {
    const { app } = usePage().props;
    const { support, author } = app;
    const year = new Date().getFullYear();
    const phoneDigits = support.phone.replace(/[^\d+]/g, '');

    const contact = [
        { icon: 'phone', label: 'Call', value: support.phone, href: `tel:${phoneDigits}` },
        { icon: 'whatsapp', label: 'WhatsApp', value: support.phone, href: `https://wa.me/${phoneDigits.replace('+', '')}` },
        { icon: 'mail', label: 'Email', value: support.email, href: `mailto:${support.email}` },
    ];

    const connect = [
        { icon: 'globe', label: 'Portfolio', value: 'ahmershah.dev', href: author.website },
        { icon: 'linkedin', label: 'LinkedIn', value: 'in/syedahmershah', href: author.linkedin },
        { icon: 'github', label: 'GitHub', value: '@ahmershahdev', href: author.github },
        { icon: 'code', label: 'Source code', value: 'ahmershahdev/zovita', href: author.source },
    ];

    return (
        <footer className="grain relative mt-24 overflow-hidden rounded-t-5xl bg-ink text-paper">
            <div className="container-x relative pt-20">
                {/* Headline + direct contact */}
                <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
                    <h2 className="font-display text-[clamp(2.75rem,7vw,7rem)] leading-[0.88] tracking-[-0.05em] lg:col-span-7">
                        Feel better, <span className="italic text-mint">sooner.</span>
                    </h2>
                    <ul className="divide-y divide-paper/15 border-y border-paper/15 lg:col-span-5">
                        {contact.map((c) => (
                            <li key={c.label}>
                                <a
                                    href={c.href}
                                    target={c.href.startsWith('http') ? '_blank' : undefined}
                                    rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                    className="group flex items-center gap-4 py-4 transition hover:text-mint"
                                >
                                    <span className="grid size-10 place-items-center rounded-full border border-paper/20 transition group-hover:border-mint group-hover:bg-mint group-hover:text-ink">
                                        <Icon name={c.icon} size={17} />
                                    </span>
                                    <span className="eyebrow w-24 text-paper/50">{c.label}</span>
                                    <span className="flex-1 text-lg tracking-tight">{c.value}</span>
                                    <Icon name="arrowUpRight" size={18} className="opacity-40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Link columns */}
                <div className="mt-20 grid grid-cols-2 gap-10 sm:grid-cols-4">
                    {columns.map((col) => (
                        <div key={col.title}>
                            <p className="eyebrow text-paper/50">{col.title}</p>
                            <ul className="mt-5 space-y-3">
                                {col.links.map(([label, href]) => (
                                    <li key={label}>
                                        <Link href={href()} className="group relative text-[0.95rem] text-paper/85 transition hover:text-paper">
                                            {label}
                                            <span className={underline} />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    <div>
                        <p className="eyebrow text-paper/50">Connect</p>
                        <ul className="mt-5 space-y-3">
                            {connect.map((c) => (
                                <li key={c.label}>
                                    <a href={c.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2.5 text-[0.95rem] text-paper/85 transition hover:text-paper">
                                        <Icon name={c.icon} size={16} className="text-mint" />
                                        <span className="relative">
                                            {c.label}
                                            <span className={underline} />
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Newsletter + hours + source */}
                <div className="mt-20 grid gap-10 border-t border-paper/15 pt-10 md:grid-cols-2 md:items-end">
                    <Newsletter />
                    <div className="flex flex-col items-start gap-5 md:items-end">
                        <p className="text-sm text-paper/60">
                            <Icon name="clock" size={14} className="mr-2 inline" />
                            Care team · {support.hours}
                        </p>
                        <Magnetic>
                            <a
                                href={author.source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2.5 rounded-full bg-paper px-5 py-3 text-sm font-medium text-ink transition hover:bg-mint"
                            >
                                <Icon name="github" size={17} /> View source on GitHub
                            </a>
                        </Magnetic>
                    </div>
                </div>

                <p aria-hidden="true" className="pointer-events-none mt-12 select-none text-center font-display text-[24vw] leading-[0.75] tracking-[-0.06em] text-paper/[0.07]">
                    Zovita<span className="italic">+</span>
                </p>

                <div className="flex flex-col gap-3 border-t border-paper/15 py-6 text-xs text-paper/50 md:flex-row md:items-center md:justify-between">
                    <p>
                        © {year} Zovita. Designed &amp; built by{' '}
                        <a href={author.website} target="_blank" rel="noopener noreferrer" className="text-paper/80 underline decoration-paper/30 underline-offset-4 hover:text-mint">
                            {author.name}
                        </a>
                        . MIT licensed.
                    </p>
                    <p>Product information is for reference only; always follow your doctor's advice. Demo catalog data from DVAGO.</p>
                </div>
            </div>
        </footer>
    );
}
