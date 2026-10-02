import { expect, test } from '@playwright/test';
import { firstProduct, watchConsole } from './helpers';

test.describe('shopping journey', () => {
    test('add to bag flies the product into the header bag', async ({ page }) => {
        const errors = watchConsole(page);
        const card = await firstProduct(page);
        const bag = page.locator('[data-fly-target="cart"]');
        const before = Number(await bag.locator('span').last().textContent());

        await card.getByRole('button', { name: /^Add .* to bag$/ }).click();
        // The parcel is in flight…
        await expect(page.locator('.fly-parcel-cart').first()).toBeAttached();
        // …lands, and the count goes up.
        await expect(bag.locator('span').last()).toHaveText(String(before + 1));
        await expect(page.locator('.fly-parcel')).toHaveCount(0, { timeout: 4000 });
        expect(errors).toEqual([]);
    });

    test('wishlist: save, move to bag, save for later', async ({ page }) => {
        const card = await firstProduct(page);
        const name = (await card.locator('h3').textContent()).trim();

        await card.getByRole('button', { name: /^Save .* to wishlist$/ }).click();
        await expect(page.locator('.fly-parcel-wishlist').first()).toBeAttached();
        await expect(page.locator('[data-fly-target="wishlist"]')).toHaveAttribute('aria-label', /Wishlist, [1-9]/);

        await page.goto('/wishlist');
        await expect(page.getByText(name).first()).toBeVisible();
        await page.getByRole('button', { name: 'Move to bag' }).first().click();
        await expect(page.getByText(/Moved to your bag/)).toBeVisible();

        await page.goto('/bag');
        await expect(page.getByText(name).first()).toBeVisible();
        await page.getByRole('button', { name: 'Save for later' }).first().click();
        await expect(page.getByText(/Saved for later/)).toBeVisible();
    });

    test('guest checkout with cash on delivery', async ({ page }) => {
        // An over-the-counter product (prescription items need an upload).
        await page.goto('/shop/otc/in-stock');
        const card = page.locator('article[data-fly-source]').filter({ has: page.getByRole('button', { name: /^Add .* to bag$/ }) }).first();
        await card.getByRole('button', { name: /^Add .* to bag$/ }).click();
        await expect(page.getByText(/Added to your bag/)).toBeVisible();

        await page.goto('/checkout');
        await page.getByLabel('Full name').fill('Playwright Tester');
        await page.getByLabel('Email').fill(`e2e+${Date.now()}@example.com`);
        await page.getByLabel(/Mobile number|Phone/).first().fill('03001234567');
        await page.getByLabel(/Street address|Address/).first().fill('House 1, Street 2, Block 3');
        await page.getByRole('combobox', { name: 'City' }).click();
        await page.getByRole('option', { name: 'Karachi' }).click();
        await page.getByRole('button', { name: /Place order/ }).click();

        await page.waitForURL(/thank-you/);
        await expect(page.getByText(/ZV-\d{6}-[A-Z0-9]{5}/).first()).toBeVisible();
    });

    test('themed dropdown works with the keyboard', async ({ page }) => {
        await page.goto('/shop');
        const sort = page.getByRole('combobox', { name: 'Sort products' });
        await sort.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('listbox')).toBeVisible();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/sort-price-asc/);
    });
});
