import useTheme from '@/hooks/useTheme';
import { cn } from '@/lib/cn';

/** Sun/moon switch: the orb slides across and the icon rotates in. */
export default function ThemeToggle({ className }) {
    const { isDark, toggle } = useTheme();

    return (
        <button
            type="button"
            onClick={toggle}
            role="switch"
            aria-checked={isDark}
            aria-label="Dark mode"
            data-cursor-magnetic
            className={cn('group relative flex h-9 w-16 shrink-0 items-center rounded-full border border-line-strong p-1 transition-colors hover:border-ink', className)}
        >
            <span
                className={cn(
                    'grid size-7 place-items-center rounded-full bg-ink text-paper transition-transform duration-700 ease-[var(--ease-expo)]',
                    isDark && 'translate-x-7 rtl:-translate-x-7',
                )}
            >
                <svg viewBox="0 0 24 24" className={cn('size-4 transition-transform duration-700 ease-[var(--ease-expo)]', isDark ? 'rotate-0' : '-rotate-90')} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    {isDark ? (
                        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
                    ) : (
                        <>
                            <circle cx="12" cy="12" r="4" />
                            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                        </>
                    )}
                </svg>
            </span>
        </button>
    );
}
