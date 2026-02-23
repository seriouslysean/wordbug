import { expect, test } from '@playwright/test';

// Build output verification for SEO metadata.
// Component tests validate the generation logic (seo-utils, schema-utils);
// these tests verify the metadata actually appears in the assembled HTML.

test.describe('SEO build output', () => {
	test('pages include essential meta tags', async ({ page }) => {
		// Homepage
		await page.goto('/');
		await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /.+/);
		await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /.+/);
		await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', /.+/);

		// Word page (navigate from homepage, no hardcoded URL)
		await page.locator('.past-words a.word-link').first().click();
		await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/word\//);
	});

	test('structured data is present', async ({ page }) => {
		await page.goto('/');

		const jsonLd = page.locator('script[type="application/ld+json"]');
		const count = await jsonLd.count();
		expect(count).toBeGreaterThan(0);

		const content = await jsonLd.first().textContent();
		const data = JSON.parse(content!);
		expect(data['@context']).toBe('https://schema.org');
	});

	test('RSS feed and sitemap are discoverable', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('link[type="application/rss+xml"]')).toHaveAttribute('href', /rss\.xml/);

		const response = await page.goto('/sitemap-index.xml');
		expect(response?.status()).toBe(200);
	});
});
