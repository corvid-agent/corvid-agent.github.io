import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared API mocking
// ---------------------------------------------------------------------------
async function mockAPIs(page: Page) {
  await page.route('**/api.github.com/users/corvid-agent/repos**', (route) => {
    const url = new URL(route.request().url());
    const pg = url.searchParams.get('page') || '1';
    if (pg !== '1') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { name: 'retry', fork: false, stargazers_count: 5 },
        { name: 'env', fork: false, stargazers_count: 3 },
        { name: 'chronos', fork: false, stargazers_count: 2 },
        { name: 'pipe', fork: false, stargazers_count: 1 },
        { name: 'throttle', fork: false, stargazers_count: 1 },
      ]),
    });
  });

  await page.route('**/api.github.com/users/corvid-agent/events/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          type: 'PushEvent',
          actor: { login: 'corvid-agent' },
          repo: { name: 'corvid-agent/retry' },
          payload: { commits: [{ sha: 'abc', message: 'fix' }] },
          created_at: new Date().toISOString(),
        },
        {
          type: 'PullRequestEvent',
          actor: { login: 'corvid-agent' },
          repo: { name: 'corvid-agent/env' },
          payload: { action: 'opened' },
          created_at: new Date().toISOString(),
        },
        {
          type: 'CreateEvent',
          actor: { login: 'corvid-agent' },
          repo: { name: 'corvid-agent/chronos' },
          payload: { ref_type: 'repository', ref: null },
          created_at: new Date().toISOString(),
        },
      ]),
    }),
  );

  await page.route('**/allo.info/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test.describe('Sections — content verification', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');
  });

  // ---- Hero badge ----
  test('hero badge shows "Agent Online" with a green dot', async ({ page }) => {
    const badge = page.locator('.hero-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Agent Online');
    await expect(badge.locator('.dot')).toBeAttached();
  });

  // ---- Stats ----
  test('stats section has 4 stat boxes', async ({ page }) => {
    const stats = page.locator('.stats .stat');
    await expect(stats).toHaveCount(4);
  });

  test('stats section contains Repositories and Stars labels', async ({ page }) => {
    await expect(page.locator('#stat-repos')).toBeAttached();
    await expect(page.locator('#stat-stars')).toBeAttached();
    await expect(page.locator('.stat-label').nth(0)).toHaveText('Repositories');
    await expect(page.locator('.stat-label').nth(1)).toHaveText('Stars');
  });

  test('stats populate from mocked GitHub data', async ({ page }) => {
    // The mocked repos return 5 non-fork repos with 12 total stars.
    // Stats use IntersectionObserver + animation; wait for values to settle.
    const repoEl = page.locator('#stat-repos');
    const starsEl = page.locator('#stat-stars');

    // Scroll the stats section into view to trigger the IntersectionObserver
    await page.locator('.stats').scrollIntoViewIfNeeded();

    // Wait for the animated counter to reach the target values
    await expect(repoEl).not.toHaveText('--', { timeout: 5000 });
    await expect(starsEl).not.toHaveText('--', { timeout: 5000 });
  });

  test('Dependencies stat shows 0', async ({ page }) => {
    const depStat = page.locator('.stat').nth(2);
    await expect(depStat.locator('.stat-value')).toHaveText('0');
    await expect(depStat.locator('.stat-label')).toHaveText('Dependencies');
  });

  test('TypeScript stat shows 100%', async ({ page }) => {
    const tsStat = page.locator('.stat').nth(3);
    await expect(tsStat.locator('.stat-value')).toHaveText('100%');
    await expect(tsStat.locator('.stat-label')).toHaveText('TypeScript');
  });

  // ---- Showcase (Built by corvid-agent) ----
  test('showcase section exists with heading', async ({ page }) => {
    const section = page.locator('#showcase');
    await expect(section).toBeAttached();
    await expect(section.locator('.section-header h2')).toHaveText('Built by corvid-agent');
  });

  test('showcase grid has multiple project cards', async ({ page }) => {
    const cards = page.locator('#showcase .eco-card');
    const count = await cards.count();
    // There are 17 showcase cards in the HTML
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('showcase includes specific projects', async ({ page }) => {
    const showcase = page.locator('#showcase');
    for (const name of ['weather-dashboard', 'bw-cinema', 'space-dashboard', 'retro-arcade']) {
      await expect(showcase.locator(`.eco-info h3:text-is("${name}")`)).toBeAttached();
    }
  });

  // ---- Mac Apps ----
  test('mac-apps section exists with heading', async ({ page }) => {
    const section = page.locator('#mac-apps');
    await expect(section).toBeAttached();
    await expect(section.locator('.section-header h2')).toHaveText('Mac Apps');
  });

  test('mac-apps grid has multiple app cards', async ({ page }) => {
    const cards = page.locator('#mac-apps .eco-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('mac-apps includes specific apps', async ({ page }) => {
    const macApps = page.locator('#mac-apps');
    for (const name of ['Beacon', 'Clip', 'DevKit', 'Netwatch', 'Pulse']) {
      await expect(macApps.locator(`.eco-info h3:text-is("${name}")`)).toBeAttached();
    }
  });

  // ---- Features ----
  test('features section exists with heading', async ({ page }) => {
    const section = page.locator('#features');
    await expect(section).toBeAttached();
    await expect(section.locator('.section-header h2')).toHaveText('Why corvid-agent?');
  });

  test('features grid has 6 feature cards', async ({ page }) => {
    const features = page.locator('#features .feature');
    await expect(features).toHaveCount(6);
  });

  test('features include expected titles', async ({ page }) => {
    const titles = [
      'Self-Improving',
      'On-Chain Identity',
      'Encrypted Messaging',
      'Multi-Agent Councils',
      'TypeScript First',
      'Bridge Everywhere',
    ];
    for (const title of titles) {
      await expect(page.locator(`#features .feature h3:text-is("${title}")`)).toBeAttached();
    }
  });

  // ---- Core Infrastructure / Ecosystem ----
  test('ecosystem section exists with heading', async ({ page }) => {
    const section = page.locator('#ecosystem');
    await expect(section).toBeAttached();
    await expect(section.locator('.section-header h2')).toHaveText('Core Infrastructure');
  });

  test('ecosystem grid has multiple cards', async ({ page }) => {
    const cards = page.locator('#ecosystem .eco-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  // ---- Packages ----
  test('packages section exists with heading', async ({ page }) => {
    const section = page.locator('#packages');
    await expect(section).toBeAttached();
    await expect(section.locator('.section-header h2')).toHaveText('npm Packages');
  });

  test('packages grid has 5 package cards', async ({ page }) => {
    const cards = page.locator('#packages .package-card');
    await expect(cards).toHaveCount(5);
  });

  test('package cards have name, description, tags, and links', async ({ page }) => {
    const firstCard = page.locator('#packages .package-card').first();
    await expect(firstCard.locator('.package-name')).toContainText('@corvid-agent/retry');
    await expect(firstCard.locator('.package-desc')).not.toBeEmpty();
    await expect(firstCard.locator('.package-tags .tag')).not.toHaveCount(0);
    await expect(firstCard.locator('.package-links a')).toHaveCount(2);
  });

  test('all package names are present', async ({ page }) => {
    const names = [
      '@corvid-agent/retry',
      '@corvid-agent/env',
      '@corvid-agent/chronos',
      '@corvid-agent/pipe',
      '@corvid-agent/throttle',
    ];
    for (const name of names) {
      await expect(page.locator(`.package-name:text-is("${name}")`)).toBeAttached();
    }
  });

  // ---- Activity Feed ----
  test('activity feed container exists', async ({ page }) => {
    await expect(page.locator('#activity-feed')).toBeAttached();
  });

  test('activity feed shows mocked events', async ({ page }) => {
    // Wait for the mocked activity items to render
    const items = page.locator('#activity-feed .activity-item');
    await expect(items.first()).toBeVisible({ timeout: 5000 });
    const count = await items.count();
    // We mocked 3 events
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('activity items have dot, text, and time', async ({ page }) => {
    const first = page.locator('#activity-feed .activity-item').first();
    await expect(first).toBeVisible({ timeout: 5000 });
    await expect(first.locator('.activity-dot')).toBeAttached();
    await expect(first.locator('.activity-text')).not.toBeEmpty();
    await expect(first.locator('.activity-time')).not.toBeEmpty();
  });

  // ---- CTA sections ----
  test('CTA section "Run Your Own Agent" exists', async ({ page }) => {
    await expect(page.locator('.cta-section').filter({ hasText: 'Run Your Own Agent' })).toBeAttached();
  });

  test('CTA section "CLI" exists', async ({ page }) => {
    await expect(page.locator('.cta-section').filter({ has: page.locator('h2', { hasText: 'CLI' }) })).toBeAttached();
  });
});
