import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'zv-theme';
const listeners = new Set();

const read = () => (typeof document === 'undefined' ? 'light' : document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

function apply(theme) {
    // Swap every colour in the same frame (no 0.5s body/colour transitions trailing behind).
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.dataset.theme = theme;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0a0f0e' : '#f3f0e8';
    try {
        localStorage.setItem(KEY, theme);
    } catch {
        /* storage blocked: the choice lasts for this page view only */
    }
    listeners.forEach((l) => l());
}

const subscribe = (l) => {
    listeners.add(l);
    return () => listeners.delete(l);
};

/**
 * Current theme + a toggle. The initial value is set before paint by the inline script in
 * app.blade.php. When `origin` (a click event) is passed and the browser supports View
 * Transitions, the new theme is revealed as a circle growing from the pointer.
 */
export default function useTheme() {
    const theme = useSyncExternalStore(subscribe, read, () => 'light');

    const toggle = useCallback((event) => {
        const next = read() === 'dark' ? 'light' : 'dark';
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!document.startViewTransition || reduced || !event) {
            apply(next);
            return;
        }

        const x = event.clientX ?? window.innerWidth / 2;
        const y = event.clientY ?? 0;
        const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        const transition = document.startViewTransition(() => apply(next));
        transition.ready.then(() => {
            document.documentElement.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
            );
        });
    }, []);

    return { theme, toggle, isDark: theme === 'dark' };
}
