import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Header search is a progressive enhancement: a magnifying-glass icon (revealed
// by JS) opens a panel that filters words by starts-with.

const discoverQuery = async (page: Page): Promise<string> => {
  const word = page.locator('.past-words a.word-link .word-link__word').first();
  await expect(word).toBeVisible();
  return (await word.textContent())?.trim().toLowerCase() ?? '';
};

test.describe('header search', () => {
  test('opens from the header icon, filters by starts-with, and navigates', async ({ page }) => {
    await page.goto('/');
    const query = await discoverQuery(page);
    expect(query).not.toBe('');

    const toggle = page.locator('#site-search-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();

    const input = page.locator('#site-search-input');
    await expect(input).toBeVisible();
    await input.fill(query);

    const results = page.locator('#site-search-results a');
    await expect(results.first()).toBeVisible();
    for (const text of await results.allTextContents()) {
      expect(text.toLowerCase().startsWith(query)).toBe(true);
    }

    await results.first().click();
    await expect(page.locator('#word-title')).toBeVisible();
  });

  test('clearing the query removes the results', async ({ page }) => {
    await page.goto('/');
    const query = await discoverQuery(page);
    expect(query).not.toBe('');
    await page.locator('#site-search-toggle').click();

    const input = page.locator('#site-search-input');
    await input.fill(query);
    await expect(page.locator('#site-search-results a').first()).toBeVisible();

    await input.fill('');
    await expect(page.locator('#site-search-results a')).toHaveCount(0);
  });

  test('closes when clicking outside the search', async ({ page }) => {
    await page.goto('/');
    await page.locator('#site-search-toggle').click();

    const input = page.locator('#site-search-input');
    await expect(input).toBeVisible();

    // A click outside the search container (the footer) dismisses the panel.
    await page.locator('footer').click();
    await expect(input).toBeHidden();
  });

  test('the search icon is hidden without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('#site-search-toggle')).toBeHidden();
    await context.close();
  });
});

test('keeps only the latest query while the word index is loading', async ({ page }) => {
  // oxlint-disable-next-line consistent-function-scoping
  let releaseResponse: () => void = () => {};
  const responseReady = new Promise<void>(resolve => {
    releaseResponse = resolve;
  });

  await page.route('**/words.json', async route => {
    await responseReady;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        { word: 'alpha', date: '20250101' },
        { word: 'banana', date: '20250102' },
      ]),
    });
  });
  await page.goto('/');
  await page.locator('#site-search-toggle').click();

  const input = page.locator('#site-search-input');
  await input.fill('a');
  await input.fill('b');
  releaseResponse();

  const results = page.locator('#site-search-results a');
  await expect(results).toHaveCount(1);
  await expect(results.first()).toContainText('banana');
});

test('recovers when the word index request fails', async ({ page }) => {
  let requests = 0;
  await page.route('**/words.json', async route => {
    requests += 1;
    if (requests === 1) {
      await route.fulfill({ status: 500 });
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([{ word: 'banana', date: '20250102' }]),
    });
  });
  await page.goto('/');
  await page.locator('#site-search-toggle').click();

  const input = page.locator('#site-search-input');
  await input.fill('a');
  await expect.poll(() => requests).toBe(1);
  // Let the rejected request clear the in-flight cache before retrying.
  await page.waitForTimeout(50);
  await input.fill('b');
  await expect.poll(() => requests).toBe(2);

  await expect(page.locator('#site-search-results a')).toHaveCount(1);
  await expect(page.locator('#site-search-results a').first()).toContainText('banana');
});
