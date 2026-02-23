import { expect, test } from '@playwright/test';

// Navigation and route resolution for the built static site.
// Tests user journeys through the site via element interaction.
// No hardcoded word URLs -- content is discovered through navigation.

test.describe('site navigation', () => {
  test('homepage renders with main content', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('homepage has navigation links to browse and stats', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('a[href*="/browse"]').first()).toBeVisible();
    await expect(page.locator('a[href*="/stats"]').first()).toBeVisible();
  });

  test('browse page lists navigation categories', async ({ page }) => {
    await page.goto('/browse');

    await expect(page.locator('a[href*="/browse/year"]').first()).toBeVisible();
    await expect(page.locator('a[href*="/browse/letter"]').first()).toBeVisible();
    await expect(page.locator('a[href*="/browse/length"]').first()).toBeVisible();
  });

  test('can navigate from year listing to a word page', async ({ page }) => {
    await page.goto('/browse/year');

    // Click a year section heading link
    const yearLink = page.locator('main a[href*="/browse/20"]').first();
    await expect(yearLink).toBeVisible();
    await yearLink.click();

    // Year page should list word links
    const wordLink = page.locator('main a[href*="/word/"]').first();
    await expect(wordLink).toBeVisible();
    await wordLink.click();

    // Word page should render content
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('word page has adjacent word navigation', async ({ page }) => {
    // Navigate to a word from the homepage previous words section
    await page.goto('/');
    await page.locator('main a[href*="/word/"]').first().click();

    const navLinks = page.locator('.word-nav a[href*="/word/"]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('browse by letter shows letter groups', async ({ page }) => {
    await page.goto('/browse/letter');

    const letterLinks = page.locator('main a[href*="/browse/letter/"]');
    const count = await letterLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('stats page is reachable', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href*="/stats"]').first().click();

    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('non-existent route returns 404', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');

    expect(response?.status()).toBe(404);
  });
});
