import { expect, test } from '@playwright/test';
import { signIn, watchConsole } from './helpers';

test('body map: pick a region and a symptom', async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto('/body-map');
    await expect(page.locator('canvas')).toBeVisible();
    await page.getByRole('button', { name: 'Chest & lungs', exact: true }).first().click();
    await page.getByRole('button', { name: 'Cough & cold' }).click();
    await expect(page.getByRole('heading', { name: /Pharmacist\s+picks/ })).toBeVisible();
    expect(errors).toEqual([]);
});

test('assistant answers predefined questions only', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open the Zovita assistant' }).click();
    const panel = page.getByRole('dialog', { name: 'Zovita assistant' });
    await expect(panel.getByText(/I'm the Zovita assistant|I know your orders/)).toBeVisible();
    await expect(panel.locator('input, textarea')).toHaveCount(0); // no free-text box
    await panel.getByRole('button', { name: 'When will my order arrive?' }).click();
    await expect(panel.getByText(/business days/)).toBeVisible();
});

test('Urdu: right-to-left interface and back @mobile', async ({ page }) => {
    await page.goto('/?lang=ur');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
    await expect(page.getByText('باڈی میپ').first()).toBeAttached();
    // Phones keep the language switch in the menu; wider screens show it in the header.
    const inHeader = page.locator('header').getByRole('button', { name: 'View in English' }).filter({ visible: true });
    if (await inHeader.count()) {
        await inHeader.first().click();
    } else {
        await page.locator('header button[aria-expanded]').filter({ visible: true }).last().click();
        await page.getByRole('dialog', { name: /Menu|مینو/ }).getByRole('button', { name: 'View in English' }).click();
    }
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('link', { name: /Body map/ }).first()).toBeAttached();
});

test('A/B experiments record exposures', async ({ page }) => {
    const exposures = [];
    page.on('request', (req) => req.url().includes('/signals/experiment') && exposures.push(req.postDataJSON()));
    await page.goto('/');
    await expect.poll(() => exposures.map((e) => e.experiment)).toContain('hero_cta');
});

test('instant navigation: hovering a link prefetches the next page', async ({ page }) => {
    await page.goto('/faq');
    const prefetched = page.waitForRequest((r) => r.url().endsWith('/about') && r.headers()['purpose'] === 'prefetch');
    await page.getByRole('link', { name: 'About' }).first().hover();
    await prefetched;
});

test('admin: dashboard charts and prescription review', async ({ page }) => {
    // The panel is invisible until a staff member signs in on the staff form.
    expect((await page.goto('/admin')).status()).toBe(404);
    await page.goto('/admin/login');
    await page.getByLabel('Work email').fill('admin@zovita.com');
    await page.getByLabel('Password', { exact: true }).fill('Admin@1234');
    await page.getByRole('button', { name: /Sign in to the admin panel/ }).click();
    await expect(page.getByRole('heading', { name: 'Today at Zovita' })).toBeVisible();
    await expect(page.locator('svg[role="img"] path').first()).toBeAttached();
    await page.goto('/admin/prescriptions');
    await expect(page.getByRole('heading', { name: 'Prescriptions' })).toBeVisible();
});
