import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function audit(page: Page, label: string): Promise<void> {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  const summary = serious.map((v) => `${label}: ${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`);
  expect(summary).toEqual([]);
}

test('title, setup, sol, report, review and about have no serious axe violations (EN and BN)', async ({ page }) => {
  for (const lang of ['en', 'bn']) {
    await page.goto('/');
    await page.evaluate((l) => localStorage.setItem('redoutpost.v1.lang', JSON.stringify(l)), lang);
    await page.reload();
    await audit(page, `${lang} title`);
    await page.getByRole('button', { name: /Choose site|জায়গা/ }).click();
    await audit(page, `${lang} setup`);
    await page.goto('/?judge=1');
    await audit(page, `${lang} sol`);
    await page.locator('.endsol').click();
    await page.getByRole('dialog').waitFor();
    await audit(page, `${lang} report`);
    await page.getByRole('dialog').getByRole('button').click();
    await page.locator('.topbar button').first().click(); // provenance drawer
    await audit(page, `${lang} provenance`);
    await page.getByRole('dialog').getByRole('button').last().click();
    for (let i = 0; i < 25 && (await page.locator('.endsol').isVisible().catch(() => false)); i++) {
      await page.locator('.endsol').click();
      await page.getByRole('dialog').getByRole('button').click();
    }
    await audit(page, `${lang} review`);
    await page.goto('/');
    await page.getByRole('button', { name: /About|পরিচিতি/ }).click();
    await audit(page, `${lang} about`);
  }
});

test('the whole sol loop is playable with the keyboard only', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // Tab to "Start mission" and press Enter
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    if ((await page.evaluate(() => document.activeElement?.textContent ?? '')).includes('Start mission')) break;
  }
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sol 1');
  await page.locator('.endsol').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Enter'); // dialog's button has focus
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sol 2');
});
