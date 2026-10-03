import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { compression } from 'vite-plugin-compression2';
import path from 'node:path';

export default defineConfig(({ isSsrBuild }) => ({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            ssr: 'resources/js/ssr.jsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
        // Pre-compressed .br and .gz next to every asset; public/.htaccess serves the best one the
        // browser accepts, so no CPU is spent compressing on each request.
        compression({ algorithms: ['brotliCompress', 'gzip'], include: /\.(js|mjs|css|svg|json|html|txt)$/, threshold: 1024 }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, 'resources/js'),
            // Ziggy's route() for the SSR server (the browser gets it from @routes).
            'ziggy-js': path.resolve(import.meta.dirname, 'vendor/tightenco/ziggy'),
        },
    },
    // Emit asset/chunk URLs relative to the importing file so lazy pages & CSS preloads
    // work at any base path (php artisan serve at "/", XAMPP at "/zovita").
    experimental: {
        renderBuiltUrl: () => ({ relative: true }),
    },
    build: {
        rollupOptions: {
            output: {
                // three.js is split out automatically via the lazy HeroScene import — don't
                // force it into a manual chunk or shared React code gets pulled in with it.
                // (Client only: the SSR bundle keeps node_modules external.)
                manualChunks: isSsrBuild ? undefined : { motion: ['gsap', 'lenis'] },
            },
        },
    },
}));
