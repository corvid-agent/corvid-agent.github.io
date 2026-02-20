import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared: mock ALL external API calls so tests never hit the network
// ---------------------------------------------------------------------------
async function mockAPIs(page: Page) {
  // GitHub repos (paginated — page 1 returns data, page 2 returns empty)
  await page.route('**/api.github.com/users/corvid-agent/repos**', (route) => {
    const url = new URL(route.request().url());
    const pg = url.searchParams.get('page') || '1';
    if (pg === '1') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { name: 'retry', fork: false, stargazers_count: 5 },
          { name: 'env', fork: false, stargazers_count: 3 },
          { name: 'chronos', fork: false, stargazers_count: 2 },
        ]),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  // GitHub public events
  await page.route('**/api.github.com/users/corvid-agent/events/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          type: 'PushEvent',
          actor: { login: 'corvid-agent' },
          repo: { name: 'corvid-agent/retry' },
          payload: { commits: [{ sha: 'abc123', message: 'fix: thing' }] },
          created_at: new Date().toISOString(),
        },
        {
          type: 'CreateEvent',
          actor: { login: 'corvid-agent' },
          repo: { name: 'corvid-agent/env' },
          payload: { ref_type: 'repository', ref: null },
          created_at: new Date().toISOString(),
        },
      ]),
    }),
  );

  // Algorand / allo.info — prevent any outbound calls
  await page.route('**/allo.info/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test.describe('App — basic loading', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
  });

  test('page loads and has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/corvid-agent/i);
  });

  test('hero section is visible with badge, heading, and CTA buttons', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();

    // Hero badge ("Agent Online")
    const badge = hero.locator('.hero-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Agent Online');

    // Heading
    await expect(hero.locator('h1')).toContainText('Autonomous AI');
    await expect(hero.locator('h1 .gradient')).toContainText('On-Chain Identity');

    // CTA buttons
    const actions = hero.locator('.hero-actions');
    await expect(actions.locator('a.btn-primary')).toHaveText(/View on GitHub/i);
    await expect(actions.locator('a.btn-secondary')).toHaveText(/View Showcase/i);
  });

  test('hero terminal is present', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('section.hero');
    await expect(hero.locator('.hero-terminal .terminal')).toBeAttached();
    await expect(hero.locator('.terminal-header')).toBeAttached();
  });

  test('particle canvas exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#particle-canvas')).toBeAttached();
  });

  test('desktop nav links are visible at 1280px viewport', async ({ page }) => {
    await page.goto('/');
    const navLinks = page.locator('.nav-links');
    await expect(navLinks).toBeVisible();

    // Check key links
    await expect(navLinks.locator('a[href="#showcase"]')).toHaveText('Showcase');
    await expect(navLinks.locator('a[href="#mac-apps"]')).toHaveText('Mac Apps');
    await expect(navLinks.locator('a[href="#features"]')).toHaveText('Features');
    await expect(navLinks.locator('a[href="#ecosystem"]')).toHaveText('Infrastructure');
    await expect(navLinks.locator('a[href="#packages"]')).toHaveText('Packages');
  });

  test('hamburger is hidden on desktop', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hamburger')).not.toBeVisible();
  });

  test('mobile nav: hamburger toggles overlay', async ({ page }) => {
    // Resize to mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const hamburger = page.locator('#hamburger');
    const mobileNav = page.locator('#mobile-nav');

    await expect(hamburger).toBeVisible();
    await expect(mobileNav).not.toBeVisible();

    // Open
    await hamburger.click();
    await expect(mobileNav).toBeVisible();
    await expect(hamburger).toHaveClass(/active/);

    // Verify mobile nav links
    await expect(mobileNav.locator('a[href="#showcase"]')).toHaveText('Showcase');
    await expect(mobileNav.locator('a[href="#features"]')).toHaveText('Features');

    // Close via hamburger
    await hamburger.click();
    await expect(mobileNav).not.toBeVisible();
  });
});
