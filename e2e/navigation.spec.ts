import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared API mocking
// ---------------------------------------------------------------------------
async function mockAPIs(page: Page) {
  await page.route('**/api.github.com/**', (route) => {
    const url = route.request().url();
    if (url.includes('/repos')) {
      const u = new URL(url);
      const pg = u.searchParams.get('page') || '1';
      if (pg !== '1') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { name: 'retry', fork: false, stargazers_count: 5 },
          { name: 'env', fork: false, stargazers_count: 3 },
        ]),
      });
    }
    // events
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          type: 'PushEvent',
          actor: { login: 'corvid-agent' },
          repo: { name: 'corvid-agent/retry' },
          payload: { commits: [{ sha: 'a1', message: 'test' }] },
          created_at: new Date().toISOString(),
        },
      ]),
    });
  });

  await page.route('**/allo.info/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
  });

  test('nav logo links to top of page', async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('.nav-logo');
    await expect(logo).toBeVisible();
    await expect(logo.locator('span')).toHaveText('corvid-agent');
    await expect(logo).toHaveAttribute('href', '#');
  });

  test('desktop nav has GitHub and Apps CTA buttons', async ({ page }) => {
    await page.goto('/');
    const ctas = page.locator('.nav-links .nav-cta');
    await expect(ctas).toHaveCount(2);
    await expect(ctas.nth(0)).toHaveText('Apps');
    await expect(ctas.nth(1)).toHaveText('GitHub');
  });

  test('section anchor links exist for all major sections', async ({ page }) => {
    await page.goto('/');
    const navLinks = page.locator('.nav-links');

    // These anchors should match real section IDs in the DOM
    for (const id of ['showcase', 'mac-apps', 'features', 'ecosystem', 'packages']) {
      const section = page.locator(`#${id}`);
      await expect(section).toBeAttached();
      await expect(navLinks.locator(`a[href="#${id}"]`)).toBeAttached();
    }
  });

  test('footer links are present', async ({ page }) => {
    await page.goto('/');
    const footerLinks = page.locator('.footer-links a');
    // The footer has many links (Source, GitHub, Chat, Dashboard, Profile, apps, etc.)
    const count = await footerLinks.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('footer contains wallet link (corvid.algo)', async ({ page }) => {
    await page.goto('/');
    const wallet = page.locator('.footer-wallet');
    await expect(wallet).toBeVisible();
    await expect(wallet).toContainText('corvid.algo');
    await expect(wallet).toHaveAttribute('href', /allo\.info/);
  });

  test('footer copyright is visible', async ({ page }) => {
    await page.goto('/');
    const copy = page.locator('.footer-copy');
    await expect(copy).toBeVisible();
    await expect(copy).toContainText('Built autonomously by');
  });

  test('back-to-top button is attached and hidden initially', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('#back-to-top');
    await expect(btn).toBeAttached();
    // Initially not visible (opacity 0, pointer-events none)
    await expect(btn).not.toHaveClass(/visible/);
  });

  test('back-to-top button becomes visible after scrolling', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('#back-to-top');

    // Scroll down past the threshold (600px)
    await page.evaluate(() => window.scrollTo(0, 800));
    await expect(btn).toHaveClass(/visible/, { timeout: 3000 });
  });

  test('mobile nav links close the overlay on click', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const hamburger = page.locator('#hamburger');
    const mobileNav = page.locator('#mobile-nav');

    await hamburger.click();
    await expect(mobileNav).toBeVisible();

    // Click a mobile nav link
    await mobileNav.locator('a[href="#features"]').click();
    await expect(mobileNav).not.toBeVisible();
  });

  test('Escape key closes mobile nav', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    await page.locator('#hamburger').click();
    await expect(page.locator('#mobile-nav')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#mobile-nav')).not.toBeVisible();
  });
});
