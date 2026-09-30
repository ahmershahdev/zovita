import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLenis } from '@/Components/motion/SmoothScroll';
import { cn } from '@/lib/cn';

/** Full-screen/side sheet shell: locks scroll, closes on Esc, backdrop click and navigation. */
export default function Overlay({ open, onClose, side = 'top', label, className, children }) {
    const lenis = useLenis();

    useEffect(() => {
        if (!open) return undefined;
        lenis?.stop();
        document.documentElement.style.overflow = 'hidden';
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        const off = router.on('start', onClose);
        return () => {
            lenis?.start();
            document.documentElement.style.overflow = '';
            window.removeEventListener('keydown', onKey);
            off();
        };
    }, [open, onClose, lenis]);

    const panel = {
        top: cn('inset-x-0 top-0 max-h-[92vh] rounded-b-4xl', open ? 'translate-y-0' : '-translate-y-full'),
        right: cn('inset-y-0 right-0 w-full max-w-md', open ? 'translate-x-0' : 'translate-x-full'),
    }[side];

    return createPortal(
        <div className={cn('fixed inset-0 z-[70]', !open && 'pointer-events-none')} aria-hidden={!open}>
            <div
                className={cn('absolute inset-0 bg-night/55 backdrop-blur-sm transition-opacity duration-500', open ? 'opacity-100' : 'opacity-0')}
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={label}
                data-lenis-prevent
                className={cn('absolute overflow-y-auto bg-paper transition-transform duration-700 ease-[var(--ease-expo)]', panel, className)}
            >
                {open && children}
            </div>
        </div>,
        document.body,
    );
}
