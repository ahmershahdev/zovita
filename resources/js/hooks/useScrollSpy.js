import { useCallback, useEffect, useState } from 'react';
import { useLenis } from '@/Components/motion/SmoothScroll';

/**
 * Tracks which of `ids` is currently being read (the last section whose top has passed ~30% of
 * the viewport) and how far through the page the reader is. `jump(id)` scrolls to a section,
 * through Lenis when smooth scrolling is on, and updates the URL hash without a history entry.
 */
export default function useScrollSpy(ids, { offset = 120 } = {}) {
    const lenis = useLenis();
    const [active, setActive] = useState(ids[0] ?? null);
    const [progress, setProgress] = useState(0);
    const key = ids.join('|');

    useEffect(() => {
        let frame = 0;
        const measure = () => {
            frame = 0;
            const line = window.innerHeight * 0.3;
            let current = ids[0] ?? null;
            for (const id of ids) {
                const el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top - line <= 0) current = id;
            }
            setActive(current);
            const first = document.getElementById(ids[0]);
            const last = document.getElementById(ids[ids.length - 1]);
            if (first && last) {
                const start = first.getBoundingClientRect().top + window.scrollY - line;
                const end = last.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
                setProgress(Math.min(1, Math.max(0, (window.scrollY - start) / Math.max(1, end - start))));
            }
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(measure);
        };
        measure();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const jump = useCallback(
        (id) => {
            const el = document.getElementById(id);
            if (!el) return;
            history.replaceState(history.state, '', `#${id}`);
            if (lenis) lenis.scrollTo(el, { offset: -offset, duration: 1.2 });
            else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
        },
        [lenis, offset],
    );

    return { active, progress, jump };
}
