import { cloneElement, useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

/** Pulls its single child towards the pointer while hovered. */
export default function Magnetic({ children, strength = 0.35 }) {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || !window.matchMedia('(pointer: fine)').matches || prefersReducedMotion()) return undefined;

        const x = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
        const y = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });

        const move = (e) => {
            const r = el.getBoundingClientRect();
            x((e.clientX - (r.left + r.width / 2)) * strength);
            y((e.clientY - (r.top + r.height / 2)) * strength);
        };
        const leave = () => {
            x(0);
            y(0);
        };

        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        return () => {
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerleave', leave);
        };
    }, [strength]);

    return cloneElement(children, { ref });
}
