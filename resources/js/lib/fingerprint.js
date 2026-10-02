/**
 * Browser fingerprint for ban enforcement: a SHA-256 of stable, non-identifying traits (screen,
 * time zone, languages, hardware, a canvas rendering). It never leaves the site and is only
 * compared against fingerprints recorded on banned accounts. Cached for the page session.
 */
let cached;

export async function fingerprint() {
    if (cached !== undefined) return cached;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 220;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '16px Arial';
        ctx.fillStyle = '#0b1b33';
        ctx.fillRect(0, 0, 220, 40);
        ctx.fillStyle = '#9ef0c2';
        ctx.fillText('Zovita + 1122', 4, 10);
        const traits = [
            navigator.userAgent,
            navigator.language,
            (navigator.languages || []).join(','),
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen.width,
            screen.height,
            screen.colorDepth,
            window.devicePixelRatio,
            navigator.hardwareConcurrency,
            navigator.deviceMemory,
            navigator.platform,
            canvas.toDataURL(),
        ].join('|');
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(traits));
        cached = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
        cached = '';
    }
    return cached;
}
