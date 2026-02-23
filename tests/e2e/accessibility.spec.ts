import { expect, test } from '@playwright/test';

// Accessibility checks for the built static site.
// Tests structural requirements that only a browser can validate:
// keyboard navigation, document attributes, and content accessibility.

test.describe('accessibility', () => {
	test('skip-to-content link works with keyboard', async ({ page }) => {
		await page.goto('/');

		const skipLink = page.locator('.skip-to-content');
		await expect(skipLink).toBeAttached();

		// Tab focuses the skip link
		await page.keyboard.press('Tab');
		await expect(skipLink).toBeFocused();

		// Skip link targets main content
		const href = await skipLink.getAttribute('href');
		expect(href).toBe('#main-content');
	});

	test('document has lang and viewport attributes', async ({ page }) => {
		await page.goto('/');

		// Screen reader language identification
		const lang = await page.locator('html').getAttribute('lang');
		expect(lang).toBeTruthy();

		// Responsive viewport for mobile access
		const viewport = page.locator('meta[name="viewport"]');
		const content = await viewport.getAttribute('content');
		expect(content).toContain('width=device-width');
	});

	test('images have alt text', async ({ page }) => {
		await page.goto('/');

		const images = page.locator('img');
		const count = await images.count();

		for (let i = 0; i < count; i++) {
			const alt = await images.nth(i).getAttribute('alt');
			expect(alt).not.toBeNull();
		}
	});

	test('links have accessible text', async ({ page }) => {
		await page.goto('/browse');

		const links = page.locator('main a');
		const count = await links.count();
		expect(count).toBeGreaterThan(0);

		for (let i = 0; i < Math.min(count, 10); i++) {
			const text = await links.nth(i).textContent();
			const ariaLabel = await links.nth(i).getAttribute('aria-label');
			expect(text?.trim() || ariaLabel).toBeTruthy();
		}
	});
});
