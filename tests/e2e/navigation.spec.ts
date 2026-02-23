import { expect, test } from '@playwright/test';

// User journey tests for the built static site.
// Each test follows a complete path a real user would take.
// No hardcoded word URLs -- content is discovered through navigation.

test.describe('user journeys', () => {
	test('discover a word and navigate between words', async ({ page }) => {
		await page.goto('/');

		// Homepage shows the featured word with its definition
		await expect(page.locator('#word-title')).toBeVisible();
		await expect(page.locator('.word-description')).toBeVisible();

		// Click a word from the "Previous Words" section
		const previousWordLink = page.locator('.past-words a.word-link').first();
		await expect(previousWordLink).toBeVisible();
		await previousWordLink.click();

		// Word page shows content and navigation
		await expect(page.locator('#word-title')).toBeVisible();
		await expect(page.locator('.word-description')).toBeVisible();
		const firstWordUrl = page.url();

		// Navigate to the previous word
		await page.locator('.word-nav__previous a.word-link').click();

		// Arrived at a different word page with content
		expect(page.url()).not.toBe(firstWordUrl);
		await expect(page.locator('#word-title')).toBeVisible();
	});

	test('browse words by year and reach a word page', async ({ page }) => {
		await page.goto('/');

		// Use footer navigation to reach browse
		await page.locator('footer a[href="/browse"]').click();
		await expect(page.locator('#main-content')).toBeVisible();

		// Select a year
		await page.locator('main a[href*="/browse/20"]').first().click();

		// Year page lists words
		const wordLink = page.locator('main a[href*="/word/"]').first();
		await expect(wordLink).toBeVisible();
		await wordLink.click();

		// Word page renders with content
		await expect(page.locator('#word-title')).toBeVisible();
		await expect(page.locator('.word-description')).toBeVisible();
	});

	test('footer provides navigation to all main sections', async ({ page }) => {
		await page.goto('/');

		// Browse Words
		await page.locator('footer a[href="/browse"]').click();
		await expect(page.locator('#main-content')).toBeVisible();

		// Stats
		await page.locator('footer a[href="/stats"]').click();
		await expect(page.locator('#main-content')).toBeVisible();

		// All Words
		await page.locator('footer a[href="/word"]').click();
		await expect(page.locator('#main-content')).toBeVisible();

		// Home
		await page.locator('footer a[href="/"]').click();
		await expect(page.locator('#main-content')).toBeVisible();
	});

	test('non-existent route returns 404', async ({ page }) => {
		const response = await page.goto('/this-page-does-not-exist');

		expect(response?.status()).toBe(404);
	});
});
