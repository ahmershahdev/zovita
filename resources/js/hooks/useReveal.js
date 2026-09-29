import { useLayoutEffect } from 'react';
import { gsap, prefersReducedMotion, ScrollTrigger, SplitText } from '@/lib/gsap';

/**
 * Scroll-triggered reveals inside `scope`:
 *   [data-reveal]            fade + rise (optionally [data-reveal-delay])
 *   [data-split]             headline split into lines that slide up from a mask
 *   [data-stagger] > *       children cascade in
 *   [data-parallax="0.2"]    drifts vertically while scrolling
 */
export default function useReveal(scope, deps = []) {
    useLayoutEffect(() => {
        if (!scope.current || prefersReducedMotion()) return undefined;

        const ctx = gsap.context(() => {
            gsap.utils.toArray('[data-reveal]').forEach((el) => {
                gsap.to(el, {
                    opacity: 1,
                    y: 0,
                    delay: Number(el.dataset.revealDelay || 0),
                    scrollTrigger: { trigger: el, start: 'top 88%', once: true },
                });
            });

            gsap.utils.toArray('[data-split]').forEach((el) => {
                const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
                gsap.from(split.lines, {
                    yPercent: 110,
                    stagger: 0.09,
                    duration: 1.3,
                    delay: Number(el.dataset.splitDelay || 0),
                    scrollTrigger: el.dataset.split === 'now' ? undefined : { trigger: el, start: 'top 85%', once: true },
                });
            });

            gsap.utils.toArray('[data-stagger]').forEach((group) => {
                gsap.from(group.children, {
                    opacity: 0,
                    y: 40,
                    stagger: 0.06,
                    scrollTrigger: { trigger: group, start: 'top 85%', once: true },
                });
            });

            gsap.utils.toArray('[data-parallax]').forEach((el) => {
                gsap.to(el, {
                    yPercent: -100 * Number(el.dataset.parallax || 0.15),
                    ease: 'none',
                    scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
                });
            });
        }, scope);

        ScrollTrigger.refresh();
        return () => ctx.revert();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
