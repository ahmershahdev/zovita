/**
 * Fire-and-forget behaviour beacons (time on product pages, A/B events). They use `keepalive`
 * so they survive the page being left, carry Laravel's XSRF token, and never throw.
 */
function xsrf() {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export function signal(name, payload) {
    try {
        fetch(route(`signals.${name}`), {
            method: 'POST',
            keepalive: true,
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf(), 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify(payload),
        }).catch(() => {});
    } catch {
        /* never let analytics break the page */
    }
}

const sent = new Set();

/** Record an experiment event once per page view (the server also de-duplicates per visitor). */
export function track(experiment, event) {
    const key = `${experiment}:${event}`;
    if (sent.has(key)) return;
    sent.add(key);
    signal('experiment', { experiment, event });
}
