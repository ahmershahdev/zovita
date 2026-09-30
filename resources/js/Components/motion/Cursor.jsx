import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';

const lerp = (a, b, t) => a + (b - a) * t;
const TEXT_FIELDS = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=submit]), textarea, [contenteditable="true"]';
const INTERACTIVE = 'a, button, [role="button"], [role="switch"], label, select, summary, [data-cursor]';

/**
 * Premium cursor for fine pointers:
 *  - a precise dot plus a trailing ring that stretches along the direction of travel
 *  - "sticky" mode: over [data-cursor-magnetic] elements the ring morphs to wrap the element
 *  - a label bubble over [data-cursor="View"] (any text) and a pulse on click
 *  - hides itself over text fields so the native caret stays in charge
 * Disabled on touch devices and for reduced-motion visitors (the native cursor is used).
 */
export default function Cursor() {
    const dot = useRef(null);
    const ring = useRef(null);
    const bubble = useRef(null);
    const [label, setLabel] = useState('');

    useEffect(() => {
        if (!window.matchMedia('(pointer: fine)').matches || prefersReducedMotion()) return undefined;
        document.documentElement.classList.add('has-cursor');

        const pos = { x: -100, y: -100 };
        const ringState = { x: -100, y: -100, w: 36, h: 36, r: 18 };
        const state = { visible: false, hidden: false, target: null, labelled: false, hover: false, down: false };
        let frame = 0;
        let bubbleScale = 0;

        const tick = () => {
            const t = state.target?.isConnected ? state.target.getBoundingClientRect() : null;
            const sticky = t && !state.labelled;

            // Targets: follow the pointer, or snap around the sticky element (with a little pointer pull).
            const tx = sticky ? t.left + t.width / 2 + (pos.x - (t.left + t.width / 2)) * 0.12 : pos.x;
            const ty = sticky ? t.top + t.height / 2 + (pos.y - (t.top + t.height / 2)) * 0.12 : pos.y;
            const size = state.labelled ? 88 : state.hover ? 56 : 36;
            const tw = sticky ? t.width + 14 : size;
            const th = sticky ? t.height + 14 : size;
            const radius = sticky ? Math.min(th / 2, parseFloat(getComputedStyle(state.target).borderRadius) + 7 || th / 2) : size / 2;

            const dx = tx - ringState.x;
            const dy = ty - ringState.y;
            ringState.x = lerp(ringState.x, tx, sticky ? 0.22 : 0.16);
            ringState.y = lerp(ringState.y, ty, sticky ? 0.22 : 0.16);
            ringState.w = lerp(ringState.w, tw, 0.2);
            ringState.h = lerp(ringState.h, th, 0.2);
            ringState.r = lerp(ringState.r, radius, 0.2);

            // Squash & stretch with speed (free-floating ring only).
            const speed = Math.min(Math.hypot(dx, dy) / 60, 0.45);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const stretch = sticky || state.labelled ? '' : ` rotate(${angle}deg) scale(${1 + speed}, ${1 - speed * 0.6}) rotate(${-angle}deg)`;
            const press = state.down ? ' scale(0.82)' : '';

            const el = ring.current;
            el.style.transform = `translate3d(${ringState.x}px, ${ringState.y}px, 0)${stretch}${press}`;
            el.style.width = `${ringState.w}px`;
            el.style.height = `${ringState.h}px`;
            el.style.borderRadius = `${ringState.r}px`;
            el.style.opacity = state.visible && !state.hidden ? '1' : '0';

            dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${sticky || state.labelled || state.hidden ? 0 : 1})`;
            dot.current.style.opacity = state.visible ? '1' : '0';

            bubbleScale = lerp(bubbleScale, state.labelled && !state.hidden ? 1 : 0, 0.18);
            bubble.current.style.transform = `translate3d(${ringState.x}px, ${ringState.y}px, 0) scale(${bubbleScale})`;
            frame = requestAnimationFrame(tick);
        };

        const onMove = (e) => {
            pos.x = e.clientX;
            pos.y = e.clientY;
            if (!state.visible) {
                state.visible = true;
                ringState.x = pos.x;
                ringState.y = pos.y;
            }
        };

        const onOver = (e) => {
            const el = e.target instanceof Element ? e.target : null;
            if (!el) return;
            const labelled = el.closest('[data-cursor]');
            state.hidden = !!el.closest(TEXT_FIELDS);
            state.labelled = !!labelled;
            state.target = el.closest('[data-cursor-magnetic]');
            state.hover = !!el.closest(INTERACTIVE);
            setLabel(labelled?.dataset.cursor ?? '');
        };

        const onDown = () => (state.down = true);
        const onUp = () => (state.down = false);
        const onLeave = () => (state.visible = false);
        const reset = () => {
            state.target = null;
            state.labelled = false;
            state.hover = false;
            setLabel('');
        };

        frame = requestAnimationFrame(tick);
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerdown', onDown);
        window.addEventListener('pointerup', onUp);
        document.addEventListener('pointerover', onOver);
        document.documentElement.addEventListener('pointerleave', onLeave);
        const off = router.on('navigate', reset);

        return () => {
            off();
            cancelAnimationFrame(frame);
            document.documentElement.classList.remove('has-cursor');
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointerover', onOver);
            document.documentElement.removeEventListener('pointerleave', onLeave);
        };
    }, []);

    return (
        <>
            <div
                ref={ring}
                aria-hidden="true"
                className="cursor-ring border border-white opacity-0 mix-blend-difference transition-opacity duration-300"
                style={{ width: 36, height: 36, translate: '-50% -50%' }}
            />
            <div ref={dot} aria-hidden="true" className="cursor-dot size-1.5 rounded-full bg-white opacity-0 mix-blend-difference transition-opacity duration-300" />
            <div ref={bubble} aria-hidden="true" className="cursor-label" style={{ transform: 'scale(0)' }}>
                <span className="grid size-22 place-items-center rounded-full bg-mint text-center font-mono text-[0.62rem] uppercase tracking-[0.12em] text-night shadow-[0_10px_40px_-10px_rgb(0_0_0/0.35)]">
                    {label}
                </span>
            </div>
        </>
    );
}
