import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (tests/e2e). They run against a separate Laravel instance with reCAPTCHA
 * switched off (a headless browser can't solve real challenges) and the site-wide request budget
 * lifted for localhost, since the whole suite runs from one IP:
 *
 *   RECAPTCHA_ENABLED=false RATE_LIMIT_ALLOWLIST=127.0.0.1 APP_URL=http://127.0.0.1:8123 php artisan serve --port=8123
 *   npx playwright test
 *
 * Set E2E_BASE_URL to point at another environment. Uses the installed Chrome (no browser download).
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8123';

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1, // `php artisan serve` handles one request at a time
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { outputFolder: 'storage/app/playwright-report', open: 'never' }]],
    outputDir: 'storage/app/playwright-results',
    use: {
        baseURL,
        channel: 'chrome',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        locale: 'en-US',
    },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } } },
        { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' }, grep: /@mobile/ },
    ],
});
