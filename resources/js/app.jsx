import '../css/app.css';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import StoreLayout from '@/Layouts/StoreLayout';

const appName = import.meta.env.VITE_APP_NAME || 'Zovita';

// Hide reveal targets only when JS runs and the visitor allows motion (see app.css).
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('js-motion');
}

createInertiaApp({
    title: (title) => (title ? `${title} — ${appName}` : `${appName} — Care, delivered`),
    resolve: async (name) => {
        const page = await resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx'));
        // Persistent layout: header, smooth scroll and cursor survive page visits.
        page.default.layout ??= (content) => <StoreLayout>{content}</StoreLayout>;
        return page;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: '#0f766e', showSpinner: false, delay: 150 },
});
