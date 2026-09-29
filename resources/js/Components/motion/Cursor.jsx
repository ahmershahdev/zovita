import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

/**
 * Two-part cursor follower (fine pointers only). The native cursor stays visible for accessibility;
 * the ring grows over links and shows a label over elements with data-cursor="View".
 */
export default function Cursor() {
    const dot = useRef(null);
    const ring = useRef(null);
    const [label, setLabel] = useState('');

    useEffect(() => {
        if (!window.matchMedia('(pointer: fine)').matches || prefersReducedMotion()) return undefined;

        const moveDot = { x: gsap.quickTo(dot.current, 'x', { duration: 0.15 }), y: gsap.quickTo(dot.current, 'y', { duration: 0.15 }) };
        const moveRing = { x: gsap.quickTo(ring.current, 'x', { duration: 0.55 }), y: gsap.quickTo(ring.current, 'y', { duration: 0.55 }) };

        const onMove = (e) => {
            moveDot.x(e.clientX);
            moveDot.y(e.clientY);
            moveRing.x(e.clientX);
            moveRing.y(e.clientY);
        };

        const onOver = (e) => {
            const labelled = e.target.closest('[data-cursor]');
            const interactive = e.target.closest('a, button, [role="button"], input, select, textarea, label');
            setLabel(labelled?.dataset.cursor ?? '');
            gsap.to(ring.current, {
                scale: labelled ? 2.6 : interactive ? 1.6 : 1,
                backgroundColor: labelled ? 'rgba(158,240,194,1)' : 'rgba(158,240,194,0)',
                duration: 0.4,
            });
            gsap.to(dot.current, { scale: labelled || interactive ? 0 : 1, duration: 0.25 });
        };

        const onLeave = () => gsap.to([dot.current, ring.current], { opacity: 0, duration: 0.2 });
        const onEnter = () => gsap.to([dot.current, ring.current], { opacity: 1, duration: 0.2 });
        const reset = () => {
            setLabel('');
            gsap.to(ring.current, { scale: 1, backgroundColor: 'rgba(158,240,194,0)', duration: 0.3 });
            gsap.to(dot.current, { scale: 1, duration: 0.3 });
        };

        gsap.set([dot.current, ring.current], { opacity: 1 });
        window.addEventListener('pointermove', onMove, { passive: true });
        document.addEventListener('pointerover', onOver);
        document.documentElement.addEventListener('pointerleave', onLeave);
        document.documentElement.addEventListener('pointerenter', onEnter);
        const off = router.on('navigate', reset);

        return () => {
            off();
            window.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerover', onOver);
            document.documentElement.removeEventListener('pointerleave', onLeave);
            document.documentElement.removeEventListener('pointerenter', onEnter);
        };
    }, []);

    return (
        <>
            <div ref={ring} className="cursor-ring grid size-10 place-items-center border border-ink/40 opacity-0 mix-blend-multiply" aria-hidden="true">
                <span className="eyebrow scale-[0.38] text-ink">{label}</span>
            </div>
            <div ref={dot} className="cursor-dot size-1.5 bg-ink opacity-0" aria-hidden="true" />
        </>
    );
}
