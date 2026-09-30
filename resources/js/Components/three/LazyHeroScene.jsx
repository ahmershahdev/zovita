import { lazy, Suspense, useEffect, useState } from 'react';
import useTheme from '@/hooks/useTheme';
import { prefersReducedMotion } from '@/lib/gsap';

const HeroScene = lazy(() => import('./HeroScene'));

function supportsWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
        return false;
    }
}

/** Loads three.js only on capable devices; otherwise shows the static fallback. */
export default function LazyHeroScene({ fallback }) {
    const [enabled, setEnabled] = useState(false);
    const { isDark } = useTheme();

    useEffect(() => {
        const saveData = navigator.connection?.saveData;
        setEnabled(supportsWebGL() && !prefersReducedMotion() && !saveData);
    }, []);

    if (!enabled) return fallback;

    return (
        <Suspense fallback={fallback}>
            <HeroScene dark={isDark} />
        </Suspense>
    );
}
