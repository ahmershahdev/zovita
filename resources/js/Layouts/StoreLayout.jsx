import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import Assistant from '@/Components/layout/Assistant';
import { LocaleSync } from '@/Components/ui/LanguageSwitch';
import CompactFooter from '@/Components/layout/CompactFooter';
import Footer from '@/Components/layout/Footer';
import Header from '@/Components/layout/Header';
import Seo from '@/Components/layout/Seo';
import Toasts from '@/Components/layout/Toasts';
import Cursor from '@/Components/motion/Cursor';
import ScrollToTop from '@/Components/motion/ScrollToTop';
import Preloader from '@/Components/motion/Preloader';
import SmoothScroll from '@/Components/motion/SmoothScroll';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

/** Persistent storefront shell (see app.jsx) — mounts once and survives Inertia visits. */
export default function StoreLayout({ children }) {
    const main = useRef(null);
    const lastUrl = useRef(null);
    // Sign-in / sign-up keep the navbar (a way back to the bag and store) but get a slim footer.
    const focused = usePage().component.startsWith('Auth/');

    // Soft page-enter transition when the path changes (not on filter/pagination query tweaks).
    useEffect(() => {
        return router.on('navigate', (event) => {
            const path = event.detail.page.url.split('?')[0];
            const changed = lastUrl.current !== null && lastUrl.current !== path;
            lastUrl.current = path;
            if (!changed || prefersReducedMotion() || !main.current) return;
            // A light settle, not a fade from blank: content is visible from the first frame.
            gsap.fromTo(main.current, { opacity: 0.6, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'opacity,transform' });
        });
    }, []);

    return (
        <SmoothScroll>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-night focus:px-4 focus:py-2 focus:text-snow">
                Skip to content
            </a>
            <Seo />
            <LocaleSync />
            <Preloader />
            <Header />
            <main id="main" ref={main} tabIndex={-1} className="outline-none">
                {children}
            </main>
            {focused ? <CompactFooter /> : <Footer />}
            <ScrollToTop />
            <Toasts />
            {!focused && <Assistant />}
            <Cursor />
        </SmoothScroll>
    );
}
