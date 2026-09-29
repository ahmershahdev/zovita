import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, 'resources/js'),
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
                manualChunks: {
                    motion: ['gsap', 'lenis'],
                },
            },
        },
    },
});
