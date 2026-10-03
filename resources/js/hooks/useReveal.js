import { useLayoutEffect } from 'react';
import { activeLocale } from '@/hooks/useT';
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

            // Urdu headlines aren't split into masked lines: the masks clip Nastaliq's tall strokes,
            // and splitting happens before the interface is translated, so the dictionary would
            // see line fragments instead of whole sentences. They fade up as one block instead.
            const urdu = activeLocale() === 'ur';
            gsap.utils.toArray('[data-split]').forEach((el) => {
                if (urdu) {
                    gsap.fromTo(el, { opacity: 0, y: 30 }, {
                        opacity: 1,
                        y: 0,
                        delay: Number(el.dataset.splitDelay || 0),
                        scrollTrigger: el.dataset.split === 'now' ? undefined : { trigger: el, start: 'top 85%', once: true },
                    });
                    return;
                }
                const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
                gsap.from(split.lines, {
                    yPercent: 110,
                    stagger: 0.09,
                    duration: 1.3,
                    delay: Number(el.dataset.splitDelay || 0),
                    scrollTrigger: el.dataset.split === 'now' ? undefined : { trigger: el, start: 'top 85%', once: true },
                });
            });

            // Explicit end values (not gsap.from): children often carry CSS transitions on opacity and
            // transform, and a ScrollTrigger refresh mid-transition would otherwise re-read their
            // "natural" state as ~0 and leave the whole group invisible. Inline props are cleared
            // afterwards so hover transitions work again.
            gsap.utils.toArray('[data-stagger]').forEach((group) => {
                gsap.fromTo(
                    group.children,
                    { opacity: 0, y: 40 },
                    {
                        opacity: 1,
                        y: 0,
                        stagger: 0.06,
                        clearProps: 'opacity,transform,translate',
                        scrollTrigger: { trigger: group, start: 'top 85%', once: true },
                    },
                );
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
