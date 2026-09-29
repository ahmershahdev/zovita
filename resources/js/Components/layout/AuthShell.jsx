import { Head } from '@inertiajs/react';
import Marquee from '@/Components/motion/Marquee';

/** Split-screen frame for sign-in / sign-up / password pages (rendered inside the store layout). */
export default function AuthShell({ title, eyebrow, heading, intro, children, footer }) {
    return (
        <section className="container-x py-10 md:py-16">
            <Head title={title}>
                <meta name="robots" content="noindex" />
            </Head>
            <div className="grid overflow-hidden rounded-5xl bg-card lg:grid-cols-2">
                <div className="grain relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
                    <p className="eyebrow text-mint">{eyebrow}</p>
                    <div>
                        <h1 className="font-display text-7xl leading-[0.9]">{heading}</h1>
                        <p className="mt-6 max-w-sm text-paper/70">{intro}</p>
                    </div>
                    <Marquee duration={30} className="-mx-12 border-t border-paper/15 pt-6">
                        {['Authentic stock', 'Pharmacist verified', 'Cash on delivery', 'Private & secure'].map((t) => (
                            <span key={t} className="px-6 font-display text-2xl text-paper/60">
                                {t} <span className="text-mint">+</span>
                            </span>
                        ))}
                    </Marquee>
                </div>
                <div className="p-6 sm:p-10 md:p-14">
                    <p className="eyebrow text-ink-mute lg:hidden">{eyebrow}</p>
                    <h2 className="mt-3 font-display text-5xl lg:mt-0">{title}</h2>
                    <div className="mt-10">{children}</div>
                    {footer && <div className="mt-10 border-t border-line pt-6 text-sm text-ink-mute">{footer}</div>}
                </div>
            </div>
        </section>
    );
}
