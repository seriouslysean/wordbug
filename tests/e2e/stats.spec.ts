import { expect, test } from '@playwright/test';

// Build-time visualizations on /stats: presence + navigability (per the project's
// E2E doctrine — not content correctness, which the unit/build layers cover).

test.describe('stats visualizations', () => {
  test('renders the activity heatmap and a navigable connections graph', async ({ page }) => {
    await page.goto('/stats');

    // CSS-grid publishing-activity heatmap is present.
    await expect(page.locator('.heatmap__grid').first()).toBeVisible();

    // The connections graph is present (demo corpus is above the threshold),
    // and a node links to a word page.
    const graph = page.locator('.word-graph__svg');
    await expect(graph).toBeVisible();
    // Click the node's dot (a solid, hittable target; the anchor's bbox center
    // is empty SVG space) — it links to that word's page.
    await graph.locator('a.word-graph__node circle').first().click();
    await expect(page.locator('#word-title')).toBeVisible();
  });

  test('shows a per-year summary on a year page', async ({ page }) => {
    await page.goto('/browse');
    await page.locator('main a[href*="/browse/20"]').first().click();
    // The year page leads with a "<year> Summary" section before the months.
    await expect(page.getByText(/Summary/i).first()).toBeVisible();
  });
});
