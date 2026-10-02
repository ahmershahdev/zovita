import { gsap, prefersReducedMotion } from '@/lib/gsap';

/**
 * Bag / wishlist motion. Anything that changes the bag or wishlist sends a visible "parcel" from
 * where the action happened to where the item now lives, so cause and effect are always visible.
 *
 *   fly('cart', { from, image })        photo lifts off, arcs into the header bag, gets swallowed
 *   fly('wishlist', { from })           a heart beats, then wobbles its way to the header heart
 *   fly(kind, { from, reverse: true })  the parcel leaves the header icon and lands on `from`
 *   breakHeart(button)                  un-saving: the heart cracks in two and falls
 *   collapse(element)                   a row/card folds out of the layout
 *
 * A flight has three beats — anticipation (lift + tilt), travel (velocity-aligned rotation,
 * squash & stretch, a trail of fading ghosts and sparks) and arrival (the icon squashes as it
 * swallows the parcel, a ring and particle burst, a floating "+1").
 * Targets are header icons tagged [data-fly-target="cart" | "wishlist"]; when one is hidden the
 * parcel heads for the bag. Everything is skipped for reduced-motion visitors, and nothing
 * depends on animation frames to finish (background tabs throttle them).
 */

const HEART =
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.4-9.3C1.2 7.7 3.4 4.5 6.8 4.5c2 0 3.6 1.1 4.2 2.6h2c.6-1.5 2.2-2.6 4.2-2.6 3.4 0 5.6 3.2 4.2 6.7-1.9 4.7-9.4 9.3-9.4 9.3Z"/></svg>';
const GHOSTS = 4;

function visibleRect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight ? r : null;
}

export function flyTarget(kind) {
    const pick = (k) => [...document.querySelectorAll(`[data-fly-target="${k}"]`)].find((el) => visibleRect(el));
    return pick(kind) ?? pick('cart') ?? null;
}

const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

function layer(className, html = '') {
    const el = document.createElement('div');
    el.className = className;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = html;
    document.body.appendChild(el);
    return el;
}

/** Self-removing particles bursting from a point. */
function burst({ x, y }, { count = 10, tone = 'mint', hearts = false, spread = 70 } = {}) {
    for (let i = 0; i < count; i++) {
        const p = layer(`fly-particle fly-particle-${tone}${hearts ? ' is-heart' : ''}`, hearts ? HEART : '');
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.6;
        const d = spread * (0.55 + Math.random() * 0.6);
        const size = hearts ? 10 + Math.random() * 6 : 4 + Math.random() * 4;
        Object.assign(p.style, { width: `${size}px`, height: `${size}px` });
        gsap.fromTo(
            p,
            { x, y, xPercent: -50, yPercent: -50, scale: 0.4, opacity: 1, rotate: 0 },
            {
                x: x + Math.cos(a) * d,
                y: y + Math.sin(a) * d + (hearts ? -14 : 8),
                scale: hearts ? 1 : 0.2,
                rotate: (Math.random() - 0.5) * 90,
                opacity: 0,
                duration: 0.7 + Math.random() * 0.35,
                ease: 'expo.out',
                onComplete: () => p.remove(),
            },
        );
        setTimeout(() => p.remove(), 1600);
    }
}

/** The receiving icon swallows the parcel: squash, spring back, ring, burst and "+1". */
export function catchAt(target, tone = 'mint', { label = '+1', hearts = false } = {}) {
    if (!target || prefersReducedMotion()) return;
    const r = target.getBoundingClientRect();
    const c = centre(r);

    gsap.timeline({ overwrite: 'auto' })
        .to(target, { scaleX: 1.18, scaleY: 0.8, duration: 0.12, ease: 'power2.out' })
        .to(target, { scaleX: 1, scaleY: 1, duration: 0.9, ease: 'elastic.out(1.2, 0.3)' });

    const ring = layer(`fly-ring fly-ring-${tone}`);
    Object.assign(ring.style, { left: `${c.x}px`, top: `${c.y}px`, width: `${r.height}px`, height: `${r.height}px` });
    gsap.fromTo(ring, { scale: 0.6, opacity: 0.9 }, { scale: 2.4, opacity: 0, duration: 0.85, ease: 'expo.out', onComplete: () => ring.remove() });
    setTimeout(() => ring.remove(), 1500);

    burst(c, { count: hearts ? 7 : 12, tone, hearts, spread: hearts ? 46 : 58 });

    if (label) {
        const tag = layer(`fly-plus fly-plus-${tone}`, label);
        gsap.fromTo(tag, { x: c.x, y: c.y + 6, xPercent: -50, yPercent: -50, opacity: 0, scale: 0.6 }, { y: c.y + 40, opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' });
        gsap.to(tag, { y: c.y + 54, opacity: 0, duration: 0.5, delay: 0.75, ease: 'power2.in', onComplete: () => tag.remove() });
        setTimeout(() => tag.remove(), 2000);
    }
}

/**
 * Fly a parcel between an element (or rect) and the bag/wishlist icon. Resolves on landing
 * (or after a timeout if frames are throttled), so callers can sequence follow-up UI.
 */
export function fly(kind, { from, image, reverse = false } = {}) {
    const target = flyTarget(kind);
    const source = from instanceof Element ? visibleRect(from) : from;
    const tone = kind === 'wishlist' ? 'coral' : 'mint';
    const hearts = kind === 'wishlist';
    if (!target || !source || prefersReducedMotion()) {
        if (!reverse) catchAt(target, tone, { hearts });
        return Promise.resolve();
    }

    const t = target.getBoundingClientRect();
    const a = centre(source);
    const b = centre(t);
    const [p0, p2] = reverse ? [b, a] : [a, b];
    // Control point: well above the higher end, pulled toward the destination, so the parcel lobs.
    const lift = Math.max(140, Math.abs(p2.x - p0.x) * 0.38);
    const p1 = { x: p0.x + (p2.x - p0.x) * 0.3, y: Math.min(p0.y, p2.y) - lift };

    const isPhoto = kind === 'cart' && image;
    const size = isPhoto ? Math.min(Math.max(source.width * 0.6, 64), 120) : 46;
    const make = (cls) => {
        const el = layer(`fly-parcel fly-parcel-${kind} ${cls}`, isPhoto ? '' : HEART);
        if (isPhoto) {
            const img = document.createElement('img');
            img.src = image;
            img.alt = '';
            img.decoding = 'async';
            el.appendChild(img);
        }
        Object.assign(el.style, { width: `${size}px`, height: `${size}px` });
        return el;
    };

    const parcel = make('');
    const ghosts = Array.from({ length: GHOSTS }, (_, i) => {
        const g = make('is-ghost');
        g.style.opacity = '0';
        g.dataset.lag = String((i + 1) * 0.045);
        return g;
    });
    const cleanup = () => [parcel, ...ghosts].forEach((el) => el.remove());

    const point = (k) => {
        const u = 1 - k;
        return { x: u * u * p0.x + 2 * u * k * p1.x + k * k * p2.x, y: u * u * p0.y + 2 * u * k * p1.y + k * k * p2.y };
    };
    const tangent = (k) => ({ x: 2 * (1 - k) * (p1.x - p0.x) + 2 * k * (p2.x - p1.x), y: 2 * (1 - k) * (p1.y - p0.y) + 2 * k * (p2.y - p1.y) });
    const shrink = (k) => (reverse ? 0.3 + k * 0.7 : 1 - k * 0.8);

    const place = (el, k, opacity) => {
        const p = point(k);
        const d = tangent(k);
        const angle = (Math.atan2(d.y, d.x) * 180) / Math.PI;
        const speed = Math.sin(k * Math.PI); // fastest mid-flight
        const wobble = hearts ? Math.sin(k * Math.PI * 5) * 9 * (1 - k) : 0;
        const stretch = 1 + speed * 0.28;
        const s = shrink(k);
        el.style.transform =
            `translate3d(${p.x + wobble}px, ${p.y}px, 0) translate(-50%, -50%) ` +
            (isPhoto
                ? `rotate(${angle * 0.18}deg) scale(${s * stretch}, ${s / stretch})`
                : `rotate(${angle}deg) scale(${s * stretch}, ${s / stretch}) rotate(${-angle + wobble * 2}deg)`);
        el.style.opacity = String(opacity);
    };

    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            cleanup();
            if (!reverse) catchAt(target, tone, { hearts });
            resolve();
        };
        setTimeout(finish, 2400);

        const state = { k: 0 };
        let lastSpark = 0;
        const tl = gsap.timeline({ onComplete: finish });

        // 1 — Anticipation: lift and tilt in place (hearts beat instead).
        place(parcel, 0, 1);
        tl.fromTo(
            parcel,
            { '--lift': 0 },
            {
                '--lift': 1,
                duration: hearts ? 0.32 : 0.22,
                ease: 'power2.out',
                onUpdate() {
                    const l = this.progress();
                    const beat = hearts ? 1 + Math.sin(l * Math.PI * 2) * 0.22 : 1 + l * 0.14;
                    const p = point(0);
                    parcel.style.transform = `translate3d(${p.x}px, ${p.y - l * 10}px, 0) translate(-50%, -50%) rotate(${hearts ? 0 : -l * 8}deg) scale(${shrink(0) * beat})`;
                    parcel.style.boxShadow = isPhoto ? `0 ${10 + l * 24}px ${30 + l * 30}px -16px rgb(11 27 51 / ${0.3 + l * 0.25})` : '';
                },
            },
        );

        // 2 — Travel with ghosts and sparks.
        tl.to(state, {
            k: 1,
            duration: kind === 'cart' ? 0.9 : 0.85,
            ease: 'power2.inOut',
            onUpdate: () => {
                const k = state.k;
                place(parcel, k, k > 0.92 ? (1 - k) * 12 : 1);
                ghosts.forEach((g, i) => {
                    const gk = Math.max(0, k - Number(g.dataset.lag));
                    place(g, gk, gk > 0 && k < 0.95 ? 0.32 - i * 0.07 : 0);
                });
                if (k - lastSpark > 0.08 && k < 0.9) {
                    lastSpark = k;
                    const p = point(k);
                    burst(p, { count: 2, tone, spread: 18, hearts: false });
                }
            },
        });
    });
}

/** Un-save: the heart splits down the middle and both halves tumble away. */
export function breakHeart(button) {
    const r = visibleRect(button);
    if (!r || prefersReducedMotion()) return;
    const c = centre(r);
    [-1, 1].forEach((side) => {
        const half = layer('fly-parcel fly-heart-half', HEART);
        half.style.clipPath = side < 0 ? 'polygon(0 0, 52% 0, 44% 40%, 56% 60%, 46% 100%, 0 100%)' : 'polygon(52% 0, 100% 0, 100% 100%, 46% 100%, 56% 60%, 44% 40%)';
        Object.assign(half.style, { width: '36px', height: '36px' });
        gsap.fromTo(
            half,
            { x: c.x, y: c.y, xPercent: -50, yPercent: -50, rotate: 0, opacity: 1 },
            { keyframes: [{ x: c.x + side * 6, duration: 0.12, ease: 'power1.out' }, { x: c.x + side * 30, y: c.y + 52, rotate: side * 42, opacity: 0, duration: 0.75, ease: 'power2.in' }], onComplete: () => half.remove() },
        );
        setTimeout(() => half.remove(), 1500);
    });
    burst(c, { count: 6, tone: 'coral', spread: 26 });
}

/** Collapse a list item out of the layout (height + fade), resolving when done. */
export function collapse(el) {
    if (!el || prefersReducedMotion()) return Promise.resolve();
    return new Promise((resolve) => {
        setTimeout(resolve, 1500);
        gsap.timeline({ onComplete: resolve })
            .to(el, { opacity: 0, scale: 0.94, filter: 'blur(6px)', duration: 0.4, ease: 'power2.in' })
            .to(el, { height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, duration: 0.45, ease: 'expo.inOut' }, '-=0.05');
    });
}

/** The visible product photo inside a container (used as the parcel image). */
export function photoIn(el) {
    const img = el?.querySelector?.('img');
    return img?.currentSrc || img?.src || null;
}

/**
 * Move between lists: a parcel leaves the source icon (towards the item) while the item's photo
 * flies into the destination icon, so the transfer reads in both directions.
 */
export function transfer(fromKind, toKind, { from, image }) {
    fly(fromKind, { from, image, reverse: true });
    return fly(toKind, { from, image });
}
