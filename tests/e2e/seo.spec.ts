import { expect, test } from '@playwright/test';

// SEO metadata verification for the built static site.
// Unit tests validate the generation logic; these tests verify that the
// metadata actually appears in the rendered HTML output.

test.describe('SEO metadata', () => {
  test('homepage has required meta tags', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /.+/);

    // OpenGraph tags
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /.+/);

    // Twitter card tags
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /.+/);
  });

  test('word page has relevant meta tags', async ({ page }) => {
    // Navigate to a word page from the homepage rather than hardcoding a URL
    await page.goto('/');
    await page.locator('main a[href*="/word/"]').first().click();

    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/word\//);
  });

  test('pages have structured data (JSON-LD)', async ({ page }) => {
    await page.goto('/');

    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    expect(count).toBeGreaterThan(0);

    const content = await jsonLd.first().textContent();
    const data = JSON.parse(content!);
    expect(data['@context']).toBe('https://schema.org');
  });

  test('RSS feed link is present', async ({ page }) => {
    await page.goto('/');

    const rssLink = page.locator('link[type="application/rss+xml"]');
    await expect(rssLink).toHaveAttribute('href', /rss\.xml/);
  });

  test('sitemap is accessible', async ({ page }) => {
    const response = await page.goto('/sitemap-index.xml');
    expect(response?.status()).toBe(200);
  });
});
