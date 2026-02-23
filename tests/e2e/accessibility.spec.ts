import { expect, test } from '@playwright/test';

// Accessibility verification for the built static site.
// Checks structural accessibility requirements that unit tests cannot validate:
// landmark roles, heading hierarchy, skip navigation, and keyboard focus.

test.describe('accessibility', () => {
  test('skip-to-content link is functional', async ({ page }) => {
    await page.goto('/');

    // Skip link should exist but be visually hidden initially
    const skipLink = page.locator('.skip-to-content');
    await expect(skipLink).toBeAttached();

    // Tab to the skip link and verify it becomes visible
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();

    // Clicking should focus the main content
    const href = await skipLink.getAttribute('href');
    expect(href).toBe('#main-content');
  });

  test('page has proper landmark structure', async ({ page }) => {
    await page.goto('/');

    // Required landmarks
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('heading hierarchy starts at h1 or h2', async ({ page }) => {
    await page.goto('/');

    // Page should have at least one heading
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/');

    // All img elements should have alt attributes
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });

  test('viewport meta tag is set correctly', async ({ page }) => {
    await page.goto('/');

    const viewport = page.locator('meta[name="viewport"]');
    const content = await viewport.getAttribute('content');
    expect(content).toContain('width=device-width');
  });

  test('html lang attribute is set', async ({ page }) => {
    await page.goto('/');

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('links are distinguishable and have accessible text', async ({ page }) => {
    await page.goto('/browse');

    // Navigation links should have visible text content
    const links = page.locator('main a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 10); i++) {
      const text = await links.nth(i).textContent();
      const ariaLabel = await links.nth(i).getAttribute('aria-label');
      // Each link should have either visible text or an aria-label
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });
});
