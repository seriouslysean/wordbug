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
		if (!imageUrl) {
			throw new Error('og:image has no content');
		}
		const imagePath = new URL(imageUrl, page.url()).pathname;
		const imageResponse = await request.get(new URL(imagePath, page.url()).href);
		expect(imageResponse.status()).toBe(200);
		expect(imageResponse.headers()['content-type']).toMatch(/^image\//);
		expect((await imageResponse.body()).length).toBeGreaterThan(0);

		// Word page (navigate from homepage, no hardcoded URL)
		await page.locator('.past-words a.word-link').first().click();
		await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/word\//);
	});

	test('an internal link is served at the URL its canonical names', async ({ page }) => {
		// Only the served build shows whether the href a page prints is the URL
		// the page is served at. The preview answers a slashless page URL with a
		// 404 where a static host redirects, so the 200 is the check.
		await page.goto('/');

		const [response] = await Promise.all([
			page.waitForResponse(candidate =>
				candidate.request().isNavigationRequest() && candidate.frame() === page.mainFrame()),
			page.locator('footer a[href="/stats/"]').click(),
		]);
		expect(response.status()).toBe(200);
		await expect(page.locator('#main-content')).toBeVisible();

		const servedPath = new URL(page.url()).pathname;
		expect(servedPath).toBe('/stats/');
		const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
		if (canonical === null) {
			throw new Error('canonical link has no href');
		}
		expect(new URL(canonical).pathname).toBe(servedPath);
	});

	test('the not-found page names no URL of its own', async ({ page }) => {
		// The host sends this page for whatever URL was missing, so a canonical
		// link, og:url or breadcrumb trail would name a URL the page is not at
		const response = await page.goto('/this-page-does-not-exist/');
		expect(response?.status()).toBe(404);

		const countBreadcrumbTrails = async () => {
			const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
			return blocks.filter(block => JSON.parse(block)['@type'] === 'BreadcrumbList').length;
		};

		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
		await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
		expect(await countBreadcrumbTrails()).toBe(0);

		// The same checks find all three on a page that has a URL
		await page.locator('footer a[href="/stats/"]').click();
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
		await expect(page.locator('meta[property="og:url"]')).toHaveCount(1);
		expect(await countBreadcrumbTrails()).toBe(1);
	});

	test('home, word, stats, browse and 404 pages carry the view transition opt-in inline', async ({ page }) => {
		// The build inlines the rule only while its chunk stays split out and
		// small (astro.config.ts, codeSplitting); nothing fails when it slips
		// back into the external stylesheet. The policy is a <meta>, which only
		// governs what follows it, so a rule the browser parsed from a <style>
		// after it is one the policy allowed: an unhashed <style is:inline>
		// written in the layout lands before the <meta> and would only seem to
		// work. This checks where the rule is, not that a transition runs
		// (docs/technical.md, Coverage)
		const findOptIn = () => page.evaluate(() => {
			const hasOptIn = (sheet: CSSStyleSheet) =>
				[...sheet.cssRules].some(rule => rule.cssText.startsWith('@view-transition'));
			const policy = document.head.querySelector('meta[http-equiv="content-security-policy"]');
			const followsPolicy = (node: Node) => policy !== null
				&& (policy.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
			const sheets = [...document.styleSheets].filter(hasOptIn).map(sheet => sheet.ownerNode);
			return {
				inlineInHeadUnderPolicy: sheets.filter(node => node instanceof HTMLStyleElement
					&& node.closest('head') !== null && followsPolicy(node)).length,
				external: sheets.filter(node => node instanceof HTMLLinkElement).length,
			};
		});
		const expectInlineOptIn = async () => {
			await expect(page.locator('#main-content')).toBeVisible();
			expect(await findOptIn()).toEqual({ inlineInHeadUnderPolicy: 1, external: 0 });
		};

		await page.goto('/');
		await expectInlineOptIn();

		await page.locator('.past-words a.word-link').first().click();
		await expect(page).toHaveURL(/\/word\//);
		await expectInlineOptIn();

		await page.locator('footer a[href="/stats/"]').click();
		await expect(page).toHaveURL(/\/stats\/$/);
		await expectInlineOptIn();

		await page.locator('footer a[href="/browse/"]').click();
		await expect(page).toHaveURL(/\/browse\/$/);
		await expectInlineOptIn();

		const response = await page.goto('/this-page-does-not-exist/');
		expect(response?.status()).toBe(404);
		await expectInlineOptIn();
	});

	test('structured data is present', async ({ page }) => {
		await page.goto('/');

		const jsonLd = page.locator('script[type="application/ld+json"]');
		const count = await jsonLd.count();
		expect(count).toBeGreaterThan(0);

		const content = await jsonLd.first().textContent();
		if (content === null) {
			throw new Error('JSON-LD script has no text');
		}
		const data = JSON.parse(content);
		expect(data['@context']).toBe('https://schema.org');
	});

	test('RSS feed and sitemap are discoverable', async ({ page, request }) => {
		await page.goto('/');
		const feed = page.locator('link[type="application/rss+xml"]');
		await expect(feed).toHaveAttribute('href', /rss\.xml/);
		const feedHref = await feed.getAttribute('href');
		if (feedHref === null) {
			throw new Error('RSS link has no href');
		}
		const feedPath = new URL(feedHref, page.url()).pathname;
		const feedResponse = await request.get(new URL(feedPath, page.url()).href);
		expect(feedResponse.status()).toBe(200);
		expect(feedResponse.headers()['content-type']).toMatch(/(?:rss\+xml|application\/xml|text\/xml)/);
		expect((await feedResponse.body()).length).toBeGreaterThan(0);

		const response = await page.goto('/sitemap-index.xml');
		expect(response?.status()).toBe(200);
	});

	test('the linked web app manifest parses and its icon is served', async ({ page, request }) => {
		await page.goto('/');
		const href = await page.locator('link[rel="manifest"]').getAttribute('href');
		if (href === null) {
			throw new Error('manifest link has no href');
		}
		const response = await request.get(new URL(href, page.url()).href);
		expect(response.status()).toBe(200);

		const manifest = await response.json();
		expect(manifest.name).toBeTruthy();
		const iconResponse = await request.get(new URL(manifest.icons[0].src, page.url()).href);
		expect(iconResponse.status()).toBe(200);
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
