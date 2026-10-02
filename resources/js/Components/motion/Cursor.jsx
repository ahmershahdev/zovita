import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';

const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a, b, t) => a + ((((b - a + 540) % 360) - 180) * t);
const TEXT_FIELDS = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=submit]), textarea, [contenteditable="true"]';
const INTERACTIVE = 'a, button, [role="button"], [role="switch"], label, select, summary';
const GRANULES = 10;
const REST_ANGLE = -38;

/**
 * The capsule cursor (fine pointers only). Its shape always says what will happen:
 *  - free:    a two-tone capsule that aligns with the direction of travel and stretches with speed;
 *             at rest it settles into the classic tilted-pill pose and breathes
 *  - action:  over links and buttons the capsule splits open around the precise dot
 *  - sticky:  over [data-cursor-magnetic] the two halves become brackets clamped around the element
 *  - label:   over [data-cursor="View"] (any text) the halves fuse into a labelled pill
 *  - click:   it squeezes and dispenses a few granules
 * Over text fields it fades out so the native caret stays in charge. Disabled on touch devices
 * and for reduced-motion visitors.
 */
export default function Cursor() {
    const halfA = useRef(null);
    const halfB = useRef(null);
    const dot = useRef(null);
    const bubble = useRef(null);
    const granules = useRef([]);
    const [label, setLabel] = useState('');

    useEffect(() => {
        if (!window.matchMedia('(pointer: fine)').matches || prefersReducedMotion()) return undefined;
        document.documentElement.classList.add('has-cursor');

        const pos = { x: -100, y: -100 };
        const c = { x: -100, y: -100, angle: REST_ANGLE, len: 26, thick: 12, gap: 0, squeeze: 1 };
        // Per-half geometry (centre, size, rotation, radius) so they can morph into brackets.
        const halves = [0, 1].map(() => ({ x: -100, y: -100, w: 13, h: 12, rot: REST_ANGLE, r: 6 }));
        const state = { visible: false, hidden: false, target: null, labelled: false, action: false, down: false, lastMove: 0 };
        const bits = Array.from({ length: GRANULES }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0 }));
        let frame = 0;
        let bubbleScale = 0;
        let prev = { x: -100, y: -100 };

        const burst = () => {
            const dir = (c.angle * Math.PI) / 180;
            bits.forEach((b, i) => {
                const a = dir + Math.PI + (Math.random() - 0.5) * 2.2 + (i % 2 ? Math.PI : 0);
                const v = 2.2 + Math.random() * 3.4;
                Object.assign(b, { x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, life: 1 });
            });
        };

        const place = (el, h, i) => {
            const outer = h.r;
            const inner = Math.min(h.r, 2 + (1 - c.squeeze) * 4);
            el.style.width = `${h.w}px`;
            el.style.height = `${h.h}px`;
            // Outer ends are round, the seam is (nearly) flat — the halves read as one capsule.
            el.style.borderRadius = i === 0 ? `${outer}px ${inner}px ${inner}px ${outer}px` : `${inner}px ${outer}px ${outer}px ${inner}px`;
            el.style.transform = `translate3d(${h.x}px, ${h.y}px, 0) translate(-50%, -50%) rotate(${h.rot}deg)`;
        };

        const tick = (now) => {
            const rect = state.target?.isConnected ? state.target.getBoundingClientRect() : null;
            const sticky = rect && !state.labelled && !state.hidden;
            const vx = pos.x - prev.x;
            const vy = pos.y - prev.y;
            prev = { ...pos };
            const speed = Math.min(Math.hypot(vx, vy), 60);
            const idle = now - state.lastMove > 900;

            c.x = lerp(c.x, pos.x, 0.28);
            c.y = lerp(c.y, pos.y, 0.28);
            if (speed > 1.5) c.angle = lerpAngle(c.angle, (Math.atan2(vy, vx) * 180) / Math.PI, 0.25);
            else if (idle) c.angle = lerpAngle(c.angle, REST_ANGLE, 0.06);
            const breathe = idle && !state.action ? Math.sin(now / 420) * 1.5 : 0;
            c.len = lerp(c.len, (state.labelled ? 0 : 26) + speed * 0.55 + breathe, 0.2);
            c.thick = lerp(c.thick, 12 - Math.min(speed * 0.06, 3), 0.2);
            c.gap = lerp(c.gap, state.action && !sticky ? 14 : 0, 0.2);
            c.squeeze = lerp(c.squeeze, state.down ? 0.78 : 1, 0.3);

            const rad = (c.angle * Math.PI) / 180;
            const ux = Math.cos(rad);
            const uy = Math.sin(rad);
            halves.forEach((h, i) => {
                const side = i === 0 ? -1 : 1;
                let t;
                if (sticky) {
                    // Brackets: thin capsules hugging the element's left and right edges.
                    const pull = 0.1;
                    const cx = rect.left + rect.width / 2 + (pos.x - (rect.left + rect.width / 2)) * pull;
                    const cy = rect.top + rect.height / 2 + (pos.y - (rect.top + rect.height / 2)) * pull;
                    t = { x: cx + side * (rect.width / 2 + 9), y: cy, w: 4, h: rect.height + 6, rot: 0, r: 2 };
                } else if (state.labelled) {
                    t = { x: c.x + side * 22, y: c.y, w: 44, h: 44, rot: 0, r: 22 };
                } else {
                    const w = (c.len / 2) * c.squeeze;
                    const off = w / 2 + c.gap / 2;
                    t = { x: c.x + ux * off * side, y: c.y + uy * off * side, w, h: c.thick * (2 - c.squeeze), rot: c.angle, r: c.thick / 2 };
                }
                const k = sticky ? 0.24 : 0.32;
                h.x = lerp(h.x, t.x, k);
                h.y = lerp(h.y, t.y, k);
                h.w = lerp(h.w, t.w, 0.22);
                h.h = lerp(h.h, t.h, 0.22);
                h.rot = lerpAngle(h.rot, t.rot, 0.25);
                h.r = lerp(h.r, t.r, 0.22);
            });

            const show = state.visible && !state.hidden;
            [halfA.current, halfB.current].forEach((node, i) => {
                place(node, halves[i], i);
                node.style.opacity = show ? '1' : '0';
            });
            halfA.current.classList.toggle('is-label', state.labelled);
            halfB.current.classList.toggle('is-label', state.labelled);

            const dotScale = state.labelled || sticky || !show ? 0 : state.action ? 1.4 : 1;
            dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${dotScale})`;

            bubbleScale = lerp(bubbleScale, state.labelled && show ? 1 : 0, 0.2);
            bubble.current.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) translate(-50%, -50%) scale(${bubbleScale})`;

            bits.forEach((b, i) => {
                const g = granules.current[i];
                if (!g) return;
                if (b.life > 0) {
                    b.x += b.vx;
                    b.y += b.vy;
                    b.vy += 0.22;
                    b.vx *= 0.96;
                    b.life -= 0.035;
                }
                g.style.opacity = String(Math.max(0, b.life));
                g.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) translate(-50%, -50%) scale(${0.4 + b.life * 0.6})`;
            });

            frame = requestAnimationFrame(tick);
        };

        const onMove = (e) => {
            pos.x = e.clientX;
            pos.y = e.clientY;
            state.lastMove = performance.now();
            if (!state.visible) {
                state.visible = true;
                c.x = prev.x = pos.x;
                c.y = prev.y = pos.y;
                halves.forEach((h) => Object.assign(h, { x: pos.x, y: pos.y }));
            }
        };

        const onOver = (e) => {
            const target = e.target instanceof Element ? e.target : null;
            if (!target) return;
            const labelled = target.closest('[data-cursor]');
            state.hidden = !!target.closest(TEXT_FIELDS);
            state.labelled = !!labelled;
            state.target = target.closest('[data-cursor-magnetic]');
            state.action = !!target.closest(INTERACTIVE);
            setLabel(labelled?.dataset.cursor ?? '');
        };

        const onDown = () => {
            state.down = true;
            if (!state.hidden) burst();
        };
        const onUp = () => (state.down = false);
        const onLeave = () => (state.visible = false);
        const reset = () => {
            state.target = null;
            state.labelled = false;
            state.action = false;
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
            <div ref={halfA} aria-hidden="true" className="cursor-half cursor-half-a opacity-0" />
            <div ref={halfB} aria-hidden="true" className="cursor-half cursor-half-b opacity-0" />
            <div ref={dot} aria-hidden="true" className="cursor-dot" />
            {Array.from({ length: GRANULES }, (_, i) => (
                <span key={i} ref={(n) => (granules.current[i] = n)} aria-hidden="true" className={i % 2 ? 'cursor-granule bg-mint' : 'cursor-granule bg-teal'} />
            ))}
            <div ref={bubble} aria-hidden="true" className="cursor-label" style={{ transform: 'scale(0)' }}>
                <span className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-night">{label}</span>
            </div>
        </>
    );
}
