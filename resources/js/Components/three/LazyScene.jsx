import { Suspense, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';

export function supportsWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
        return false;
    }
}

/**
 * Mounts a lazily imported three.js scene only when it is near the viewport, WebGL is available and
 * the visitor hasn't asked for reduced motion / data saving. Otherwise renders `fallback`.
 * `Scene` must be a React.lazy component. `interactive` scenes still load under reduced motion
 * (they are functional, not decorative) but receive `reducedMotion` to skip idle animation.
 */
export default function LazyScene({ Scene, fallback = null, className, interactive = false, ...props }) {
    const box = useRef(null);
    const [state, setState] = useState({ capable: false, near: false, reduced: false });

    useEffect(() => {
        const reduced = prefersReducedMotion();
        const capable = supportsWebGL() && !navigator.connection?.saveData && (interactive || !reduced);
        setState((s) => ({ ...s, capable, reduced }));
        if (!capable || !box.current) return undefined;

        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setState((s) => ({ ...s, near: true }));
                    io.disconnect();
                }
            },
            { rootMargin: '300px' },
        );
        io.observe(box.current);
        return () => io.disconnect();
    }, [interactive]);

    return (
        <div ref={box} className={className}>
            {state.capable && state.near ? (
                <Suspense fallback={fallback}>
                    <Scene reducedMotion={state.reduced} {...props} />
                </Suspense>
            ) : (
                fallback
            )}
        </div>
    );
}
