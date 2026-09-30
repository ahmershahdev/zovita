import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useLenis } from './SmoothScroll';

const R = 26;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * Scroll-progress orb: a ring fills as you read, the centre shows the percentage, and on hover the
 * number rolls away for an arrow. Clicking glides back to the top (via Lenis when active).
 */
export default function ScrollToTop() {
    const lenis = useLenis();
    const ring = useRef(null);
    const number = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
            ring.current?.style.setProperty('stroke-dashoffset', String(CIRCUMFERENCE * (1 - progress)));
            if (number.current) number.current.textContent = String(Math.round(progress * 100)).padStart(2, '0');
            setVisible(window.scrollY > window.innerHeight * 0.6);
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    const toTop = () => {
        if (lenis) lenis.scrollTo(0, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('main')?.focus({ preventScroll: true });
    };

    return (
        <button
            type="button"
            onClick={toTop}
            aria-label="Back to top"
            tabIndex={visible ? 0 : -1}
            data-cursor-magnetic
            className={cn(
                'group fixed bottom-5 right-5 z-40 grid size-16 place-items-center rounded-full text-ink transition-[opacity,transform] duration-700 ease-[var(--ease-expo)] md:bottom-8 md:right-8',
                visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 scale-75 opacity-0',
            )}
        >
            <span className="glass absolute inset-1 rounded-full border border-line shadow-[0_18px_50px_-20px_rgb(0_0_0/0.45)] transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-110" />
            <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden="true">
                <circle cx="32" cy="32" r={R} fill="none" stroke="var(--color-line-strong)" strokeWidth="1.5" />
                <circle
                    ref={ring}
                    cx="32"
                    cy="32"
                    r={R}
                    fill="none"
                    stroke="var(--color-teal)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE}
                />
            </svg>
            <span className="relative block h-5 overflow-hidden">
                <span className="flex flex-col items-center transition-transform duration-500 ease-[var(--ease-expo)] group-hover:-translate-y-1/2">
                    <span ref={number} className="flex h-5 items-center font-mono text-[0.7rem]">
                        00
                    </span>
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 19V5M6 11l6-6 6 6" />
                    </svg>
                </span>
            </span>
        </button>
    );
}
