import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { renderToString } from 'react-dom/server';
import { route } from 'ziggy-js';
import StoreLayout from '@/Layouts/StoreLayout';
import { Ziggy } from './ziggy';
import { setActiveLocale } from '@/hooks/useT';

/**
 * Server-side rendering (php artisan inertia:start-ssr, see deploy/supervisor.conf). Crawlers and
 * slow phones get the full page body in the first HTML response; the browser then hydrates it.
 *
 * Only the body is rendered here. The <head> (title, meta, Open Graph, JSON-LD) is already written
 * by resources/views/app.blade.php from App\Support\Seo, so the SSR head is dropped to avoid
 * duplicate tags. Routes come from resources/js/ziggy.js (php artisan ziggy:generate).
 */
const appName = import.meta.env.VITE_APP_NAME || 'Zovita';
const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });

createServer((page) =>
    createInertiaApp({
        page,
        render: renderToString,
        title: (title) => (title ? `${title} — ${appName}` : `${appName} — Care, delivered`),
        resolve: (name) => {
            const module = pages[`./Pages/${name}.jsx`];
            module.default.layout ??= (content) => <StoreLayout>{content}</StoreLayout>;
            return module;
        },
        setup: ({ App, props }) => {
            setActiveLocale(page.props.locale?.code);
            // Same base URL the browser's @routes uses (this request's app URL), not the one
            // ziggy.js was generated with, so server and client links match exactly.
            const base = new URL(page.props.app?.url ?? Ziggy.url);
            const location = new URL(page.url, base);
            global.route = (name, params, absolute) => route(name, params, absolute, { ...Ziggy, url: base.origin + base.pathname.replace(/\/$/, ''), port: base.port || null, location });
            return <App {...props} />;
        },
    }).then(({ body }) => ({ head: [], body })),
);
