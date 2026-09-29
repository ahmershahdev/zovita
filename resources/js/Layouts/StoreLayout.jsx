import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import Footer from '@/Components/layout/Footer';
import Header from '@/Components/layout/Header';
import Toasts from '@/Components/layout/Toasts';
import Cursor from '@/Components/motion/Cursor';
import Preloader from '@/Components/motion/Preloader';
import SmoothScroll from '@/Components/motion/SmoothScroll';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

/** Persistent storefront shell (see app.jsx) — mounts once and survives Inertia visits. */
export default function StoreLayout({ children }) {
    const main = useRef(null);
    const lastUrl = useRef(null);

    // Soft page-enter transition when the path changes (not on filter/pagination query tweaks).
    useEffect(() => {
        return router.on('navigate', (event) => {
            const path = event.detail.page.url.split('?')[0];
            const changed = lastUrl.current !== null && lastUrl.current !== path;
            lastUrl.current = path;
            if (!changed || prefersReducedMotion() || !main.current) return;
            gsap.fromTo(main.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, clearProps: 'transform' });
        });
    }, []);

    return (
        <SmoothScroll>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
                Skip to content
            </a>
            <Preloader />
            <Header />
            <main id="main" ref={main}>
                {children}
            </main>
            <Footer />
            <Toasts />
            <Cursor />
        </SmoothScroll>
    );
}
