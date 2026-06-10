import { expect, test } from '@playwright/test';

// Header search is a progressive enhancement: a magnifying-glass icon (revealed
// by JS) opens a panel that filters words by starts-with.

test.describe('header search', () => {
  test('opens from the header icon, filters by starts-with, and navigates', async ({ page }) => {
    await page.goto('/');

    const toggle = page.locator('#site-search-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();

    const input = page.locator('#site-search-input');
    await expect(input).toBeVisible();
    await input.fill('wor');

    const results = page.locator('#site-search-results a');
    await expect(results.first()).toBeVisible();
    for (const text of await results.allTextContents()) {
      expect(text.toLowerCase().startsWith('wor')).toBe(true);
    }

    await results.first().click();
    await expect(page.locator('#word-title')).toBeVisible();
  });

  test('clearing the query removes the results', async ({ page }) => {
    await page.goto('/');
    await page.locator('#site-search-toggle').click();

    const input = page.locator('#site-search-input');
    await input.fill('wor');
    await expect(page.locator('#site-search-results a').first()).toBeVisible();

    await input.fill('');
    await expect(page.locator('#site-search-results a')).toHaveCount(0);
  });

  test('the search icon is hidden without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('#site-search-toggle')).toBeHidden();
    await context.close();
  });
});
