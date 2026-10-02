import '../css/app.css';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/noto-nastaliq-urdu/arabic-400.css';
import '@fontsource/noto-nastaliq-urdu/arabic-600.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot, hydrateRoot } from 'react-dom/client';
import StoreLayout from '@/Layouts/StoreLayout';
import { installPrefetch } from '@/lib/prefetch';

const appName = import.meta.env.VITE_APP_NAME || 'Zovita';
const pages = import.meta.glob('./Pages/**/*.jsx');

// Hide reveal targets only when JS runs and the visitor allows motion (see app.css).
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('js-motion');
}

createInertiaApp({
    title: (title) => (title ? `${title} — ${appName}` : `${appName} — Care, delivered`),
    resolve: async (name) => {
        const page = await resolvePageComponent(`./Pages/${name}.jsx`, pages);
        // Persistent layout: header, smooth scroll and cursor survive page visits.
        page.default.layout ??= (content) => <StoreLayout>{content}</StoreLayout>;
        return page;
    },
    setup({ el, App, props }) {
        // Server-rendered HTML (INERTIA_SSR_ENABLED) is hydrated; otherwise render from scratch.
        if (el.hasChildNodes()) {
            hydrateRoot(el, <App {...props} />);
        } else {
            createRoot(el).render(<App {...props} />);
        }
    },
    // Pages are usually prefetched on hover, so the bar only appears for genuinely slow visits.
    progress: { color: '#0f766e', showSpinner: false, delay: 350 },
});

// Hover prefetch warms both the next page's data and its code chunk (only that one chunk).
installPrefetch((component) => pages[`./Pages/${component}.jsx`]?.());
