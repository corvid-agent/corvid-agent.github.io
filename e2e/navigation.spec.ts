import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should have navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav a').first()).toBeVisible();
  });

  test('should show packages grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.packages-grid')).toBeVisible();
  });

  test('should have back-to-top button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#back-to-top')).toBeAttached();
  });

  test('should show stats section', async ({ page }) => {
    // Mock GitHub API to prevent network issues
    await page.route('**/api.github.com/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );
    await page.goto('/');
    await expect(page.locator('.stats')).toBeVisible();
  });
});
