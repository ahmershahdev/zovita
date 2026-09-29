import '../css/app.css';
import '@fontsource-variable/jetbrains-mono';

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
    progress: { color: '#9ef0c2', showSpinner: false, delay: 150 },
});
