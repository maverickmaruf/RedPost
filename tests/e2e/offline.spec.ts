import { expect, test, type Page } from '@playwright/test';

async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // First load is not controlled by the new worker; reload once so it is.
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

async function endSols(page: Page, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await page.getByRole('button', { name: /End sol/ }).click();
    await page.getByRole('dialog').getByRole('button').click();
  }
}

test('makes no request to any host but its own', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol !== 'data:') foreign.push(r.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Start mission/ }).click();
  await endSols(page, 2);
  await page.getByRole('button', { name: /Data/ }).click();
  await expect(page.getByRole('dialog')).toContainText('DONKI');
  expect(foreign).toEqual([]);
});

test('works fully offline after the first load', async ({ page, context }) => {
  await page.goto('/');
  await waitForServiceWorker(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Red Outpost');
  await page.getByRole('button', { name: /Start mission/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sol 1 of 30');
  await endSols(page, 3);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sol 4 of 30');
  // Data screens work offline too
  await page.getByRole('button', { name: /Data/ }).click();
  await expect(page.getByRole('dialog')).toContainText('InSight');
});

test('switches to Bangla and back', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'বাংলা' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('লাল ঘাঁটি');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Red Outpost');
});

test('progress persists across reloads', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /Start mission/ }).click();
  await endSols(page, 2);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Continue: sol 3/ })).toBeVisible();
});

test('renders and plays with storage blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: /cannot be saved/ })).toBeVisible();
  await page.getByRole('button', { name: /Start mission/ }).click();
  await endSols(page, 1);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sol 2 of 30');
});

test('judge mode opens on a real storm forecast', async ({ page }) => {
  await page.goto('/?judge=1');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sol 12 of 30');
  await expect(page.locator('.forecast')).toContainText(/solar storm reaches Mars/);
  await expect(page.locator('.forecast')).toContainText(/travelled \d+ min/);
});

test('a mission can be lost and the review explains why', async ({ page }) => {
  await page.goto('/?judge=1');
  // Ignore the warnings: radio off, walk outside every sol through the May 2024 storms.
  for (let i = 0; i < 19; i++) {
    if (!(await page.getByRole('button', { name: /End sol/ }).isVisible().catch(() => false))) break;
    await page.getByRole('radiogroup', { name: 'Radio to Earth' }).getByRole('radio', { name: /Off/ }).click();
    await page.getByRole('radiogroup', { name: 'Crew today' }).getByRole('radio', { name: /Walk outside/ }).click();
    await endSols(page, 1);
  }
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Flight Director's Review");
  await expect(page.getByText('What happened')).toBeVisible();
  await expect(page.getByText(/Dashed line/)).toBeVisible();
});

test('a mission code from the review starts the same mission for a friend', async ({ page }) => {
  await page.goto('/?judge=1');
  for (let i = 0; i < 25 && (await page.locator('.endsol').isVisible().catch(() => false)); i++) await endSols(page, 1);
  const code = (await page.locator('.code-big').textContent())!.trim();
  expect(code).toMatch(/^[0-9A-Z]{3}-[0-9A-Z]{4}$/);
  await page.goto('/');
  await page.getByLabel(/mission code/).fill(code.toLowerCase());
  await page.getByRole('button', { name: 'Go' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sol 1 of 30 · Jezero Crater · 1 May 2024');
  await page.goto('/');
  await page.getByLabel(/mission code/).fill('ZZZ-ZZZZ');
  await page.getByRole('button', { name: 'Go' }).click();
  await expect(page.getByText(/doesn't work/)).toBeVisible();
});

test('after three failures Mission Control sends help, and says so', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('redoutpost.v1.fails', JSON.stringify({ 'jezero|2025-06': 3 })));
  await page.reload();
  await page.getByRole('button', { name: /Start mission/ }).click();
  await expect(page.getByText(/Mission Control sent extra supplies/)).toBeVisible();
  await expect(page.locator('.meter').first()).toContainText('65 kWh');
});
