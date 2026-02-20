import { test, expect } from '@playwright/test';

test.describe('App', () => {
  test('should load page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/corvid-agent/i);
  });

  test('should show hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero')).toBeVisible();
  });

  test('should show particle canvas', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#particle-canvas')).toBeVisible();
  });
});
