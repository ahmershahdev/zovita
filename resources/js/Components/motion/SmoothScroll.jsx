import { router } from '@inertiajs/react';
import Lenis from 'lenis';
import { createContext, useContext, useEffect, useState } from 'react';
import { gsap, prefersReducedMotion, ScrollTrigger } from '@/lib/gsap';

const LenisContext = createContext(null);

/** Access the Lenis instance (null when reduced motion is on) — e.g. lenis?.stop() under a modal. */
export const useLenis = () => useContext(LenisContext);

/**
 * Lenis smooth scrolling driven by GSAP's ticker so ScrollTrigger stays perfectly in sync.
 * Disabled for visitors who prefer reduced motion.
 */
export default function SmoothScroll({ children }) {
    const [lenis, setLenis] = useState(null);

    useEffect(() => {
        if (prefersReducedMotion()) return undefined;

        const instance = new Lenis({ lerp: 0.1, wheelMultiplier: 0.95, smoothWheel: true });
        instance.on('scroll', ScrollTrigger.update);
        const tick = (time) => instance.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        setLenis(instance);

        // Inertia resets (or preserves) window scroll on visits; resync Lenis to wherever that landed.
        const off = router.on('navigate', () => {
            instance.scrollTo(window.scrollY, { immediate: true, force: true });
            requestAnimationFrame(() => ScrollTrigger.refresh());
        });

        return () => {
            off();
            gsap.ticker.remove(tick);
            instance.destroy();
        };
    }, []);

    return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
