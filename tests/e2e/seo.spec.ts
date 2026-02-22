import { expect, test } from '@playwright/test';

// SEO metadata verification for the built static site.
// Unit tests validate the generation logic; these tests verify that the
// metadata actually appears in the rendered HTML output.

test.describe('SEO metadata', () => {
  test('homepage has required meta tags', async ({ page }) => {
    await page.goto('/');

    // Description meta tag
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);

    // Canonical URL
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /.+/);

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

  test('word page has word-specific meta tags', async ({ page }) => {
    await page.goto('/word/awareness');

    // Title should include the word
    await expect(page).toHaveTitle(/awareness/i);

    // Description should have content
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);

    // Canonical URL should point to this word page
    const canonical = page.locator('link[rel="canonical"]');
    const href = await canonical.getAttribute('href');
    expect(href).toContain('/word/awareness');
  });

  test('pages have structured data (JSON-LD)', async ({ page }) => {
    await page.goto('/');

    // Should have at least one JSON-LD script tag
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    expect(count).toBeGreaterThan(0);

    // Parse and validate the first structured data block
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

  test('educational meta tags are present', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('meta[name="educational-content"]')).toHaveAttribute('content', 'true');
    await expect(page.locator('meta[name="content-rating"]')).toHaveAttribute('content', 'educational');
  });
});
