import { createHmac } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

/** The test two-step secret tests/e2e/prepare.php gives the seeded owner (global setup). */
export const ADMIN_TOTP_SECRET = process.env.E2E_TOTP_SECRET || 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

/** RFC 6238 code for a base32 secret at a 30-second step, exactly as an authenticator app computes it. */
export function totp(secret, step = Math.floor(Date.now() / 1000 / 30)) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const ch of secret.replace(/[^A-Z2-7]/gi, '').toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
    const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const hash = createHmac('sha1', key).update(counter).digest();
    const offset = hash[19] & 0x0f;
    return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

// The server refuses a code from a time-step it already accepted (replay protection), so each
// sign-in waits for a step this run hasn't used yet. Kept in a file: workers can restart.
const STEP_FILE = join(tmpdir(), 'zovita-e2e-totp-step');
async function freshStep() {
    let last = 0;
    try {
        last = Number(readFileSync(STEP_FILE, 'utf8')) || 0;
    } catch {
        /* first sign-in of the run */
    }
    let step = Math.floor(Date.now() / 1000 / 30);
    while (step <= last) {
        await new Promise((r) => setTimeout(r, 1000));
        step = Math.floor(Date.now() / 1000 / 30);
    }
    writeFileSync(STEP_FILE, String(step));
    return step;
}

/** Staff sign-in: password on the staff form, then the two-step code. */
export async function adminSignIn(page, email = 'admin@zovita.com', password = 'Admin@1234') {
    await page.goto('/admin/login');
    await page.getByLabel('Work email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: /Sign in to the admin panel/ }).click();
    await page.waitForURL(/\/admin\/two-factor/);
    await page.getByLabel('6-digit code').fill(totp(ADMIN_TOTP_SECRET, await freshStep()));
    await page.getByRole('button', { name: /Verify and open the admin panel/ }).click();
    await page.waitForURL((url) => !url.pathname.includes('two-factor'));
}
