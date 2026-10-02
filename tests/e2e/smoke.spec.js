import { expect, test } from '@playwright/test';
import { PUBLIC_PAGES, brokenImages, watchConsole } from './helpers';

/**
 * Smoke: every public page loads without server or console errors, has exactly one <h1>, shows all
 * its images, and doesn't scroll sideways on a phone.
 */
for (const path of PUBLIC_PAGES) {
    test(`page ${path} loads cleanly @mobile`, async ({ page }, info) => {
        const errors = watchConsole(page);
        const response = await page.goto(path);
        expect(response.status(), 'HTTP status').toBeLessThan(400);

        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('main, #main').first()).toBeVisible();
        expect(await brokenImages(page), 'broken images').toEqual([]);

        if (info.project.name === 'mobile') {
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(1);
        }
        expect(errors, 'console errors').toEqual([]);
    });
}

test('unknown URLs render the branded 404 @mobile', async ({ page }) => {
    const response = await page.goto('/definitely-not-a-page');
    expect(response.status()).toBe(404);
    await expect(page.getByText('This page is out of stock.', { exact: true })).toBeVisible();
    await expect(page.getByRole('search')).toBeVisible();
    await page.getByRole('link', { name: /Shop the pharmacy/ }).click();
    await expect(page).toHaveURL(/\/shop$/);
});

test('security headers and CSP are present', async ({ request }) => {
    const res = await request.get('/');
    const headers = res.headers();
    expect(headers['content-security-policy']).toMatch(/script-src 'self' 'nonce-/);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
});

test('machine-readable files are served', async ({ request }) => {
    for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/llms-full.txt']) {
        const res = await request.get(path);
        expect(res.status(), path).toBe(200);
    }
});
