import { router } from '@inertiajs/react';

/**
 * Instant navigation: when the pointer rests on (or a finger touches) any internal link, the next
 * page's data is fetched in the background, so the click itself swaps pages with no wait and no
 * progress bar. One delegated listener covers every <Link> on the site.
 *
 * Skipped for: other origins, downloads, new tabs, non-GET Inertia links (logout), hash-only links,
 * the admin file viewer, and visitors with Save-Data on.
 */
const SKIP = /\/(logout|admin\/prescriptions\/\d+\/file)(\/|$)/;
const done = new Map();
const TTL = 30_000;

function candidate(target) {
    const a = target instanceof Element ? target.closest('a[href]') : null;
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.noPrefetch !== undefined) return null;
    if (a.getAttribute('data-method') && a.getAttribute('data-method') !== 'get') return null;
    let url;
    try {
        url = new URL(a.href, window.location.href);
    } catch {
        return null;
    }
    if (url.origin !== window.location.origin || SKIP.test(url.pathname)) return null;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
    return url.href;
}

let warmComponent = () => {};

function prefetch(url) {
    const last = done.get(url);
    if (last && Date.now() - last < TTL) return;
    done.set(url, Date.now());
    try {
        router.prefetch(
            url,
            {
                method: 'get',
                onPrefetched: (response) => {
                    // The adapter hands over the raw body (a JSON string) at this point.
                    let page = response?.data;
                    if (typeof page === 'string') {
                        try {
                            page = JSON.parse(page);
                        } catch {
                            page = null;
                        }
                    }
                    if (page?.component) warmComponent(page.component);
                },
            },
            { cacheFor: '30s' },
        );
    } catch {
        /* older adapter or offline: a normal visit still works */
    }
}

export function installPrefetch(warm) {
    if (typeof window === 'undefined' || navigator.connection?.saveData) return;
    if (warm) warmComponent = warm;
    let timer = 0;
    document.addEventListener(
        'pointerover',
        (e) => {
            if (e.pointerType === 'touch') return;
            const url = candidate(e.target);
            if (!url) return;
            clearTimeout(timer);
            timer = setTimeout(() => prefetch(url), 65); // intent, not a pass-through
        },
        { passive: true },
    );
    document.addEventListener('pointerout', () => clearTimeout(timer), { passive: true });
    document.addEventListener(
        'touchstart',
        (e) => {
            const url = candidate(e.target);
            if (url) prefetch(url);
        },
        { passive: true },
    );
    document.addEventListener('focusin', (e) => {
        const url = candidate(e.target);
        if (url) prefetch(url);
    });
}
