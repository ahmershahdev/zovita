import { expect, test } from '@playwright/test';
import { adminSignIn, watchConsole } from './helpers';

/** Card payments, drug-interaction warnings, staff roles and two-step sign-in, end to end. */

async function addToBag(page, slug) {
    await page.goto(`/product/${slug}`);
    // The product page answers with the fly-to-bag animation (no toast), so wait for the request itself.
    await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === '/bag' && r.request().method() === 'POST'),
        page.getByRole('button', { name: /^Add · PKR/ }).first().click(),
    ]);
}

async function fillCheckout(page) {
    await page.goto('/checkout');
    await page.getByLabel('Full name').fill('Playwright Tester');
    await page.getByLabel('Email').fill(`e2e+${Date.now()}@example.com`);
    await page.getByLabel(/Mobile number|Phone/).first().fill('03001234567');
    await page.getByLabel(/Street address|Address/).first().fill('House 1, Street 2, Block 3');
    await page.getByRole('combobox', { name: 'City' }).click();
    await page.getByRole('option', { name: 'Karachi' }).click();
}

test('the bag warns about two paracetamol products and checkout asks for acknowledgement', async ({ page }) => {
    const errors = watchConsole(page);
    await addToBag(page, 'panadol-500mg-tablets');
    await addToBag(page, 'buscopan-plus-tablets-10x10s');

    await page.goto('/bag');
    const warning = page.getByTestId('interaction-warnings');
    await expect(warning).toContainText('Paracetamol in more than one product');
    await expect(warning).toContainText('Serious');

    await fillCheckout(page);
    await page.getByRole('button', { name: /Place order/ }).click();
    await expect(page.getByText(/tick the box to continue/)).toBeVisible();
    await page.getByText(/I've read this and will check with a pharmacist/).click();
    await page.getByRole('button', { name: /Place order/ }).click();
    await page.waitForURL(/thank-you/);
    expect(errors).toEqual([]);
});

test('card payment through the sandbox gateway confirms the order', async ({ page }) => {
    await addToBag(page, 'panadol-500mg-tablets');
    await fillCheckout(page);
    await page.getByText('Debit or credit card').click();
    await page.getByRole('button', { name: /Continue to payment/ }).click();

    await page.waitForURL(/\/payments\/sandbox\//);
    await expect(page.getByText(/Sandbox payment page/)).toBeVisible();
    await page.getByRole('button', { name: 'Pay now' }).click();

    // The verified webhook marks it paid, so the return page hands over to the confirmation.
    await page.waitForURL(/thank-you/);
    await expect(page.getByText(/Paid by card/).first()).toBeVisible();
});

test('a cancelled card payment can be retried', async ({ page }) => {
    await addToBag(page, 'panadol-500mg-tablets');
    await fillCheckout(page);
    await page.getByText('Debit or credit card').click();
    await page.getByRole('button', { name: /Continue to payment/ }).click();
    await page.waitForURL(/\/payments\/sandbox\//);
    const number = await page.getByText(/ZV-\d{6}-[A-Z0-9]{5}/).first().textContent();

    // Leaving the card page: the return page offers another try while the items are held.
    await page.goto(`/checkout/payment/${number.trim()}?cancelled=1`);
    await expect(page.getByRole('heading', { name: 'Payment cancelled' })).toBeVisible();
    await page.getByRole('button', { name: 'Try the payment again' }).click();
    await page.waitForURL(/\/payments\/sandbox\//);
    await page.getByRole('button', { name: 'Pay now' }).click();
    await page.waitForURL(/thank-you/);
});

test('staff sign-in needs the two-step code and the owner sees staff management @mobile', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Work email').fill('admin@zovita.com');
    await page.getByLabel('Password', { exact: true }).fill('Admin@1234');
    await page.getByRole('button', { name: /Sign in to the admin panel/ }).click();
    await page.waitForURL(/\/admin\/two-factor/);
    // A password alone opens nothing.
    expect((await page.goto('/admin')).status()).toBe(404);

    await adminSignIn(page);
    await page.goto('/admin/staff');
    await expect(page.getByRole('heading', { name: 'Staff' })).toBeVisible();
    await expect(page.getByText('What each role can do')).toBeVisible();
    await page.goto('/admin/security');
    await expect(page.getByText('Your role')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
});
