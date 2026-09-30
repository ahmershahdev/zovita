import { Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Magnetic from '@/Components/motion/Magnetic';
import Marquee from '@/Components/motion/Marquee';
import Icon from '@/Components/ui/Icon';
import { useRecaptchaV3 } from '@/hooks/useRecaptcha';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

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
            ['Body map', () => route('body-map')],
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
            <p className="mt-3 font-display text-3xl leading-tight">Seasonal care tips & real offers. No spam.</p>
            <div className="group mt-6 flex items-center gap-2 border-b border-snow/25 pb-3 transition-colors focus-within:border-mint">
                <input
                    id="newsletter-email"
                    type="email"
                    required
                    autoComplete="email"
                    maxLength={190}
                    value={form.data.email}
                    onChange={(e) => form.setData('email', e.target.value)}
                    placeholder="Enter your email address"
                    className="min-w-0 flex-1 bg-transparent text-lg text-snow placeholder:text-snow/35 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={form.processing}
                    data-cursor-magnetic
                    className="group/sub grid size-12 place-items-center overflow-hidden rounded-full bg-mint text-night transition-transform duration-500 hover:scale-105 disabled:opacity-50"
                    aria-label="Subscribe"
                >
                    <span className="relative grid place-items-center">
                        <Icon name="arrow" size={18} className="transition-transform duration-500 group-hover/sub:translate-x-8" />
                        <Icon name="arrow" size={18} className="absolute -translate-x-8 transition-transform duration-500 group-hover/sub:translate-x-0" />
                    </span>
                </button>
            </div>
            {(form.errors.email || form.errors.recaptcha_token) && <p className="mt-2 text-sm text-coral">{form.errors.email || form.errors.recaptcha_token}</p>}
            <p className="mt-3 text-xs text-snow/45">Protected by reCAPTCHA. Google's Privacy Policy and Terms apply.</p>
        </form>
    );
}

/** Live Karachi time + whether the care team is on shift (Mon–Sat, 10:00–20:00 PKT). */
function LiveClock() {
    const [now, setNow] = useState(null);

    useEffect(() => {
        const update = () => setNow(new Date());
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, []);

    if (!now) return <span className="font-mono text-sm text-snow/60">--:--:--</span>;

    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', hour12: false })
            .formatToParts(now)
            .map((p) => [p.type, p.value]),
    );
    const hour = Number(parts.hour);
    const online = parts.weekday !== 'Sun' && hour >= 10 && hour < 20;

    return (
        <span className="flex items-center gap-3 font-mono text-sm">
            <span className="relative flex size-2.5">
                {online && <span className="absolute inset-0 rounded-full bg-mint [animation:pulse-ring_1.8s_ease-out_infinite]" />}
                <span className={online ? 'relative size-2.5 rounded-full bg-mint' : 'relative size-2.5 rounded-full bg-snow/30'} />
            </span>
            <span className="text-snow/60">Karachi</span>
            <span className="text-snow">
                {parts.hour}:{parts.minute}:{parts.second}
            </span>
            <span className="text-snow/60">· Care team {online ? 'online' : 'offline'}</span>
        </span>
    );
}

/** Giant outlined wordmark: letters rise in when it enters view, and each one fills under the pointer. */
function Wordmark() {
    const ref = useRef(null);

    // IntersectionObserver rather than ScrollTrigger: the footer lives in the persistent layout, so
    // trigger positions measured at mount go stale as pages of different heights swap in above it.
    useEffect(() => {
        if (prefersReducedMotion()) return undefined;
        const letters = ref.current.querySelectorAll('[data-letter]');
        gsap.set(letters, { yPercent: 100 });
        const io = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            gsap.to(letters, { yPercent: 0, stagger: 0.06, duration: 1.4, ease: 'expo.out' });
            io.disconnect();
        }, { threshold: 0.2 });
        io.observe(ref.current);
        return () => {
            io.disconnect();
            gsap.set(letters, { clearProps: 'transform' });
        };
    }, []);

    return (
        <p ref={ref} aria-hidden="true" className="flex select-none justify-center overflow-hidden pt-10 font-display text-[21vw] leading-[0.78] tracking-[-0.06em]">
            {'Zovita'.split('').map((l, i) => (
                <span key={i} data-letter className="text-outline inline-block text-snow/30 transition-[color,transform,-webkit-text-fill-color] duration-700 ease-[var(--ease-expo)] [-webkit-text-fill-color:transparent] hover:-translate-y-[0.08em] hover:text-mint hover:[-webkit-text-fill-color:var(--color-mint)]">
                    {l}
                </span>
            ))}
            <span data-letter className="inline-block italic text-mint/80 transition-transform duration-700 ease-[var(--ease-expo)] hover:rotate-90">
                +
            </span>
        </p>
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
        { icon: 'mail', label: 'Email', value: support.email, href: `mailto:${support.email}` },
        { icon: 'phone', label: 'Call', value: support.phone, href: `tel:${phoneDigits}` },
        { icon: 'whatsapp', label: 'WhatsApp', value: support.phone, href: `https://wa.me/${phoneDigits.replace('+', '')}` },
    ];

    const connect = [
        { icon: 'globe', label: 'Portfolio', href: author.website },
        { icon: 'linkedin', label: 'LinkedIn', href: author.linkedin },
        { icon: 'github', label: 'GitHub', href: author.github },
        { icon: 'code', label: 'Source code', href: author.source },
    ];

    return (
        <footer className="grain relative mt-16 overflow-hidden rounded-t-[3rem] bg-night text-snow md:rounded-t-[4.5rem]">
            {/* Ticker */}
            <div className="border-b border-snow/10 py-5">
                <Marquee duration={50} itemClassName="gap-12 pr-12">
                    {['Authentic medicines', 'Pharmacist verified', 'Delivered across Pakistan', 'Cash on delivery', 'Care, calmly'].map((t) => (
                        <span key={t} className="flex items-center gap-12 font-display text-4xl text-snow/80 md:text-5xl">
                            {t}
                            <Icon name="sparkle" size={26} className="text-mint" />
                        </span>
                    ))}
                </Marquee>
            </div>

            <div className="container-x relative pt-20">
                {/* CTA */}
                <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
                    <div className="lg:col-span-8">
                        <p className="eyebrow text-mint">Need a hand?</p>
                        <h2 className="mt-5 font-display text-[clamp(3rem,8vw,8.5rem)] leading-[0.86] tracking-[-0.055em]">
                            Feel better, <span className="italic text-mint">sooner.</span>
                        </h2>
                    </div>
                    <div className="flex lg:col-span-4 lg:justify-end">
                        <Magnetic strength={0.45}>
                            <Link
                                href={route('shop.index')}
                                data-cursor-magnetic
                                className="group relative grid size-40 place-items-center overflow-hidden rounded-full bg-mint text-night md:size-48"
                            >
                                <span className="absolute inset-0 origin-bottom scale-y-0 rounded-full bg-snow transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-y-100" />
                                <span className="relative flex flex-col items-center gap-2 font-display text-2xl">
                                    <Icon name="arrowUpRight" size={30} className="transition-transform duration-700 ease-[var(--ease-expo)] group-hover:rotate-45" />
                                    Shop now
                                </span>
                            </Link>
                        </Magnetic>
                    </div>
                </div>

                {/* Direct contact */}
                <ul className="mt-16 grid border-y border-snow/15 md:grid-cols-3 md:divide-x md:divide-snow/15">
                    {contact.map((c) => (
                        <li key={c.label} className="border-b border-snow/15 last:border-b-0 md:border-b-0">
                            <a
                                href={c.href}
                                target={c.href.startsWith('http') ? '_blank' : undefined}
                                rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                className="group relative flex items-center gap-4 overflow-hidden px-1 py-6 md:px-6"
                            >
                                <span className="absolute inset-0 origin-bottom scale-y-0 bg-snow/[0.04] transition-transform duration-500 ease-[var(--ease-expo)] group-hover:scale-y-100" />
                                <span className="relative grid size-11 place-items-center rounded-full border border-snow/20 transition-colors duration-500 group-hover:border-mint group-hover:bg-mint group-hover:text-night">
                                    <Icon name={c.icon} size={18} />
                                </span>
                                <span className="relative min-w-0 flex-1">
                                    <span className="eyebrow block text-snow/45">{c.label}</span>
                                    <span className="mt-1 block truncate text-lg tracking-tight transition-colors group-hover:text-mint">{c.value}</span>
                                </span>
                                <Icon name="arrowUpRight" size={18} className="relative opacity-40 transition duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                            </a>
                        </li>
                    ))}
                </ul>

                {/* Newsletter + link columns */}
                <div className="mt-20 grid gap-14 lg:grid-cols-12">
                    <div className="lg:col-span-5">
                        <Newsletter />
                    </div>
                    <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:col-span-7">
                        {columns.map((col) => (
                            <div key={col.title}>
                                <p className="eyebrow text-snow/45">{col.title}</p>
                                <ul className="mt-5 space-y-3">
                                    {col.links.map(([label, href]) => (
                                        <li key={label}>
                                            <Link href={href()} className="group relative text-[0.95rem] text-snow/80 transition-colors hover:text-snow">
                                                {label}
                                                <span className={underline} />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        <div>
                            <p className="eyebrow text-snow/45">Connect</p>
                            <ul className="mt-5 space-y-3">
                                {connect.map((c) => (
                                    <li key={c.label}>
                                        <a href={c.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2.5 text-[0.95rem] text-snow/80 transition-colors hover:text-snow">
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
                </div>

                {/* Status row */}
                <div className="mt-20 flex flex-col items-start gap-4 border-t border-snow/15 pt-8 md:flex-row md:items-center md:justify-between">
                    <LiveClock />
                    <p className="flex items-center gap-2 text-sm text-snow/60">
                        <Icon name="clock" size={14} /> {support.hours}
                    </p>
                </div>

                <Wordmark />

                <p className="border-t border-snow/15 py-7 text-center text-sm text-snow/55">
                    © {year} Zovita. Designed &amp; built by{' '}
                    <a href={author.website} target="_blank" rel="noopener noreferrer" className="text-snow underline decoration-snow/30 underline-offset-4 transition-colors hover:text-mint hover:decoration-mint">
                        {author.name}
                    </a>
                    .
                </p>
            </div>
        </footer>
    );
}
