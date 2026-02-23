import { expect, test } from '@playwright/test';

// Navigation and route resolution for the built static site.
// These tests verify that pre-rendered pages exist and link to each other
// correctly -- something unit tests cannot validate.

test.describe('site navigation', () => {
  test('homepage loads and displays current word', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Word of the Day/);

    // Main content area exists
    const main = page.locator('#main-content');
    await expect(main).toBeVisible();
  });

  test('homepage links to browse and stats sections', async ({ page }) => {
    await page.goto('/');

    // Header navigation links exist
    const nav = page.locator('header');
    await expect(nav).toBeVisible();

    // Browse and stats links should be present in the page
    const browseLink = page.locator('a[href*="/browse"]').first();
    const statsLink = page.locator('a[href*="/stats"]').first();
    await expect(browseLink).toBeVisible();
    await expect(statsLink).toBeVisible();
  });

  test('browse page loads and lists navigation options', async ({ page }) => {
    await page.goto('/browse');

    await expect(page).toHaveTitle(/Browse/i);

    // Should have links to year, letter, and length browse pages
    await expect(page.locator('a[href*="/browse/year"]').first()).toBeVisible();
    await expect(page.locator('a[href*="/browse/letter"]').first()).toBeVisible();
    await expect(page.locator('a[href*="/browse/length"]').first()).toBeVisible();
  });

  test('browse by year page lists available years', async ({ page }) => {
    await page.goto('/browse/year');

    // Should contain links to individual year pages
    await expect(page.locator('a[href*="/browse/2025"]').first()).toBeVisible();
  });

  test('year page lists words for that year', async ({ page }) => {
    await page.goto('/browse/2025');

    // Should contain word links
    const wordLinks = page.locator('a[href*="/word/"]');
    const count = await wordLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('browse by letter page lists available letters', async ({ page }) => {
    await page.goto('/browse/letter');

    // Should contain letter links
    const letterLinks = page.locator('a[href*="/browse/letter/"]');
    const count = await letterLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('stats page loads and lists stat categories', async ({ page }) => {
    await page.goto('/stats');

    await expect(page).toHaveTitle(/Stats/i);
  });

  test('word page displays word details', async ({ page }) => {
    // Use a word we know exists in the demo data
    await page.goto('/word/awareness');

    await expect(page).toHaveTitle(/awareness/i);

    // Should display the word
    const heading = page.locator('h1, h2').first();
    await expect(heading).toContainText(/awareness/i);
  });

  test('word page has navigation to adjacent words', async ({ page }) => {
    await page.goto('/word/awareness');

    // Should have previous/next navigation links
    const navLinks = page.locator('a[href*="/word/"]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking a word link navigates to word page', async ({ page }) => {
    await page.goto('/browse/2025');

    // Click the first word link
    const firstWordLink = page.locator('a[href*="/word/"]').first();
    const href = await firstWordLink.getAttribute('href');
    await firstWordLink.click();

    // Should navigate to the word page
    await expect(page).toHaveURL(new RegExp(href!));
  });

  test('404 page renders for non-existent routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');

    // Static sites serve 404.html for missing routes via the preview server
    // The page should still render (Astro preview serves the 404 page)
    expect(response?.status()).toBe(404);
  });
});
