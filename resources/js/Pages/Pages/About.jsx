import { Head, usePage } from '@inertiajs/react';
import { useRef } from 'react';
import Marquee from '@/Components/motion/Marquee';
import Button from '@/Components/ui/Button';
import Icon from '@/Components/ui/Icon';
import SectionHeading from '@/Components/ui/SectionHeading';
import useReveal from '@/hooks/useReveal';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';

const values = [
    ['shield', 'Verified sourcing', 'We buy only through recognised distributors and manufacturers, so every pack is traceable to its source.'],
    ['rx', 'Pharmacist first', 'Every order — and every prescription — is reviewed by a licensed pharmacist before it leaves us.'],
    ['package', 'Careful handling', 'Sealed, batch-checked stock, packed with the right handling for each product.'],
    ['phone', 'People you can reach', 'A real care team on the phone and email, six days a week.'],
];

export default function About({ stats }) {
    const { app } = usePage().props;
    const scope = useRef(null);
    useReveal(scope);

    return (
        <div ref={scope}>
            <Head title="About">
                <meta head-key="description" name="description" content="Zovita is building the calmest, most trustworthy online pharmacy." />
            </Head>
            <div className="container-x pt-8 md:pt-10">
                <Breadcrumbs items={[{ label: 'About' }]} />
            </div>

            <section className="container-x pb-20 pt-10 md:pt-16">
                <p className="eyebrow text-ink-mute">About Zovita</p>
                <h1 className="mt-6 max-w-6xl font-display text-display" data-split="now">
                    Healthcare shopping should feel <span className="italic text-teal">calm.</span>
                </h1>
                <div className="mt-14 grid gap-10 md:grid-cols-12">
                    <p className="text-xl leading-relaxed text-ink-soft md:col-span-6 md:col-start-7" data-reveal>
                        Zovita began with a simple frustration: buying medicine online felt either sketchy or stressful. We are building the opposite — an honest pharmacy with authentic stock, clear information and pharmacists who pick up the phone.
                    </p>
                </div>
            </section>

            <div className="overflow-hidden rounded-5xl bg-ink py-10 text-paper">
                <Marquee duration={36}>
                    {['Authentic', 'Transparent', 'Pharmacist-led', 'Secure', 'Kind'].map((w) => (
                        <span key={w} className="flex items-center gap-10 px-5 font-display text-7xl md:text-9xl">
                            {w} <span className="text-mint">+</span>
                        </span>
                    ))}
                </Marquee>
            </div>

            <section className="container-x py-14 md:py-20">
                <div className="grid gap-px overflow-hidden rounded-4xl border border-line bg-line sm:grid-cols-3" data-stagger>
                    {[
                        [`${stats.products}+`, 'Products listed'],
                        [stats.brands, 'Brands & manufacturers'],
                        ['6 days', 'Care team availability'],
                    ].map(([value, label]) => (
                        <div key={label} className="bg-paper p-8 md:p-10">
                            <p className="font-display text-7xl md:text-8xl">{value}</p>
                            <p className="eyebrow mt-4 text-ink-mute">{label}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="container-x pb-16 md:pb-32">
                <SectionHeading
                    index="01"
                    eyebrow="How we work"
                    title={
                        <>
                            Principles, not <span className="italic">slogans.</span>
                        </>
                    }
                />
                <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2" data-stagger>
                    {values.map(([icon, title, body], i) => (
                        <article key={title} className="flex flex-col justify-between gap-12 rounded-4xl bg-card p-8 md:p-10">
                            <div className="flex items-center justify-between">
                                <span className="grid size-14 place-items-center rounded-full bg-mint">
                                    <Icon name={icon} size={24} />
                                </span>
                                <span className="font-mono text-sm text-ink-mute">0{i + 1}</span>
                            </div>
                            <div>
                                <h3 className="font-display text-4xl">{title}</h3>
                                <p className="mt-3 max-w-md text-ink-soft">{body}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="container-x">
                <div className="grain relative grid gap-10 overflow-hidden rounded-5xl bg-mint p-8 md:grid-cols-12 md:p-14">
                    <div className="md:col-span-7">
                        <p className="eyebrow">Coming soon</p>
                        <h2 className="mt-4 font-display text-5xl md:text-7xl">Zovita for Android & iOS.</h2>
                        <p className="mt-4 max-w-md">Faster re-orders, saved care routines and live tracking — in your pocket.</p>
                    </div>
                    <div className="flex items-end gap-3 md:col-span-5 md:justify-end">
                        <Button href={route('shop.index')} icon={<Icon name="arrow" size={16} />}>
                            Shop on the web
                        </Button>
                        <Button href={`mailto:${app.support.email}`} external variant="ghost">
                            Get notified
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
