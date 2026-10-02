import { expect } from '@playwright/test';

export const PUBLIC_PAGES = ['/', '/shop', '/shop/medicines', '/body-map', '/faq', '/about', '/contact', '/policies/returns', '/policies/shipping', '/policies/privacy', '/policies/terms', '/prescription', '/track-order', '/login', '/register', '/bag', '/wishlist'];

/** Console errors worth failing on (third-party noise and known library deprecations filtered). */
export function watchConsole(page) {
    const errors = [];
    page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (/THREE\.|favicon|recaptcha|Failed to load resource: the server responded with a status of 404 \(Not Found\)$/i.test(text)) return;
        errors.push(text);
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    return errors;
}

/** Scroll through the page so lazy images load, then return any that failed. */
export async function brokenImages(page) {
    await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    return page.evaluate(() =>
        [...document.images]
            .filter((img) => img.currentSrc || img.src)
            .filter((img) => img.complete && img.naturalWidth === 0)
            .map((img) => img.currentSrc || img.src),
    );
}

/** First in-stock product card on the shop page. */
export async function firstProduct(page) {
    await page.goto('/shop/in-stock');
    const card = page.locator('article[data-fly-source]').filter({ has: page.getByRole('button', { name: /^Add .* to bag$/ }) }).first();
    await expect(card).toBeVisible();
    return card;
}

export async function signIn(page, email, password) {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'));
}
