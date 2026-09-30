import { useLayoutEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

/** Short brand intro, shown once per browser session. */
export default function Preloader() {
    const root = useRef(null);
    const [done, setDone] = useState(() => {
        try {
            return prefersReducedMotion() || sessionStorage.getItem('zv-intro') === '1';
        } catch {
            return true;
        }
    });

    useLayoutEffect(() => {
        if (done) return undefined;
        const counter = { value: 0 };
        const number = root.current.querySelector('[data-count]');

        const tl = gsap.timeline({
            onComplete: () => {
                try {
                    sessionStorage.setItem('zv-intro', '1');
                } catch {
                    /* private mode */
                }
                setDone(true);
            },
        });

        tl.from('[data-word]', { yPercent: 110, duration: 1, stagger: 0.08 })
            .to(counter, {
                value: 100,
                duration: 1.1,
                ease: 'power2.inOut',
                onUpdate: () => {
                    number.textContent = String(Math.round(counter.value)).padStart(3, '0');
                },
            }, 0)
            .to('[data-word]', { yPercent: -110, duration: 0.7, stagger: 0.05, ease: 'expo.in' }, '+=0.1')
            .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=0.3');

        return () => tl.kill();
    }, [done]);

    if (done) return null;

    return (
        <div ref={root} className="fixed inset-0 z-[90] flex items-end justify-between bg-night p-6 text-snow md:p-10" style={{ clipPath: 'inset(0 0 0 0)' }}>
            <div className="font-display text-[18vw] leading-[0.85] md:text-[12vw]">
                {['Zovita', '+'].map((w) => (
                    <span key={w} className="line-mask inline-block pr-[0.06em]">
                        <span data-word className={`inline-block ${w === '+' ? 'text-mint' : ''}`}>
                            {w}
                        </span>
                    </span>
                ))}
            </div>
            <span data-count className="font-mono text-sm text-mint">
                000
            </span>
        </div>
    );
}
