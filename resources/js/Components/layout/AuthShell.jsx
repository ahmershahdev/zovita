import { Head, Link, usePage } from '@inertiajs/react';
import { lazy, useLayoutEffect, useRef } from 'react';
import LazyScene from '@/Components/three/LazyScene';
import Icon from '@/Components/ui/Icon';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

const HelixScene = lazy(() => import('@/Components/three/HelixScene'));

const perks = [
    ['shield', 'Authentic, batch-checked stock'],
    ['rx', 'Prescriptions reviewed by pharmacists'],
    ['lock', 'Encrypted, private account data'],
];

/**
 * Split-screen frame for sign-in / sign-up / password pages (rendered inside the store layout).
 * Left: night panel with a 3D capsule helix and the headline. Right: the form.
 * `step` renders a small "01 / 02"-style progress marker when a flow has several screens.
 */
export default function AuthShell({ title, eyebrow, heading, intro, children, footer, step }) {
    const root = useRef(null);

    useLayoutEffect(() => {
        if (prefersReducedMotion()) return undefined;
        const ctx = gsap.context(() => {
            gsap.from('[data-auth-line] > span', { yPercent: 110, duration: 1.3, stagger: 0.08, delay: 0.1 });
            gsap.from('[data-auth-fade]', { opacity: 0, y: 20, duration: 1, stagger: 0.06, delay: 0.35 });
        }, root);
        return () => ctx.revert();
    }, [title]);

    return (
        <section ref={root} className="px-3 pb-10 pt-4 md:px-5">
            <Head title={title}>
                {/* Server decides per route: sign-in/up are indexable, password-reset pages are not. */}
                <meta head-key="robots" name="robots" content={usePage().props.seo?.robots ?? 'noindex,follow'} />
            </Head>
            <div className="mx-auto grid min-h-[calc(100svh-8rem)] max-w-[1600px] overflow-hidden rounded-[2.5rem] border border-line bg-card lg:grid-cols-[1.05fr_1fr]">
                {/* Visual panel */}
                <div className="grain relative hidden overflow-hidden bg-night text-snow lg:flex lg:flex-col lg:justify-between lg:p-12">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,rgb(158_240_194/0.18),transparent_60%)]" />
                    <LazyScene Scene={HelixScene} className="absolute inset-0" />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,var(--color-night)_18%,transparent_62%)]" />

                    <div className="relative flex items-center justify-between">
                        <Link href={route('home')} className="font-display text-3xl">
                            Zovita<span className="text-mint">+</span>
                        </Link>
                        <p className="eyebrow text-mint">{eyebrow}</p>
                    </div>

                    <div className="relative">
                        <h1 className="font-display text-[clamp(3.5rem,5.6vw,6.5rem)] leading-[0.88] tracking-[-0.055em]">
                            <span data-auth-line className="line-mask">
                                <span className="block">{heading}</span>
                            </span>
                        </h1>
                        <p data-auth-fade className="mt-6 max-w-sm text-snow/70">
                            {intro}
                        </p>
                        <ul className="mt-10 space-y-3">
                            {perks.map(([icon, label]) => (
                                <li key={label} data-auth-fade className="flex items-center gap-3 text-sm text-snow/80">
                                    <span className="grid size-9 place-items-center rounded-full border border-snow/20 text-mint">
                                        <Icon name={icon} size={16} />
                                    </span>
                                    {label}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Form panel */}
                <div className="flex flex-col p-6 sm:p-10 md:p-14 xl:p-20">
                    <div className="flex items-center justify-between">
                        <p data-auth-fade className="eyebrow text-ink-mute">
                            <span className="lg:hidden">{eyebrow}</span>
                            <span className="hidden lg:inline">Secure area</span>
                        </p>
                        {step && (
                            <p className="font-mono text-xs text-ink-mute">
                                <span className="text-ink">{step[0]}</span> / {step[1]}
                            </p>
                        )}
                    </div>
                    <div className="my-auto w-full max-w-md py-10 lg:mx-auto">
                        <h2 className="font-display text-[clamp(2.6rem,4vw,3.75rem)] leading-[0.95]">
                            <span data-auth-line className="line-mask">
                                <span className="block">{title}</span>
                            </span>
                        </h2>
                        <p data-auth-fade className="mt-3 text-ink-mute lg:hidden">
                            {intro}
                        </p>
                        <div data-auth-fade className="mt-10">
                            {children}
                        </div>
                        {footer && (
                            <div data-auth-fade className="mt-10 border-t border-line pt-6 text-sm text-ink-mute">
                                {footer}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
