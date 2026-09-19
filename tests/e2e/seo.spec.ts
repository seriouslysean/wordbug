import { expect, test } from '@playwright/test';

// Build output verification for SEO metadata.
// Component tests validate the generation logic (seo-utils, schema-utils);
// these tests verify the metadata actually appears in the assembled HTML.

test.describe('SEO build output', () => {
	test('pages include essential meta tags and a reachable social image', async ({ page, request }) => {
		// Homepage
		await page.goto('/');
		await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /.+/);
		await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /.+/);
		await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', /.+/);
		const imageUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
		expect(imageUrl).toBeTruthy();
		const imagePath = new URL(imageUrl!, page.url()).pathname;
		const imageResponse = await request.get(new URL(imagePath, page.url()).href);
		expect(imageResponse.status()).toBe(200);
		expect(imageResponse.headers()['content-type']).toMatch(/^image\//);
		expect((await imageResponse.body()).length).toBeGreaterThan(0);

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

	test('RSS feed and sitemap are discoverable', async ({ page, request }) => {
		await page.goto('/');
		const feed = page.locator('link[type="application/rss+xml"]');
		await expect(feed).toHaveAttribute('href', /rss\.xml/);
		const feedHref = await feed.getAttribute('href');
		const feedPath = new URL(feedHref!, page.url()).pathname;
		const feedResponse = await request.get(new URL(feedPath, page.url()).href);
		expect(feedResponse.status()).toBe(200);
		expect(feedResponse.headers()['content-type']).toMatch(/(?:rss\+xml|application\/xml|text\/xml)/);
		expect((await feedResponse.body()).length).toBeGreaterThan(0);

		const response = await page.goto('/sitemap-index.xml');
		expect(response?.status()).toBe(200);
	});

	test('favicon.ico serves an ICO image', async ({ request }) => {
		const response = await request.get('/favicon.ico', { maxRedirects: 0 });
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toMatch(/image\/(x-icon|vnd\.microsoft\.icon)/);

		const body = await response.body();
		expect(body.readUInt16LE(0)).toBe(0);
		expect(body.readUInt16LE(2)).toBe(1);
		expect(body.readUInt16LE(4)).toBe(1);
	});
});
