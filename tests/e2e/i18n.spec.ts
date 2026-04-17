import { test, expect } from '@playwright/test';

const HOST = 'aquariumcommu.com';

test.describe('i18n locale routing (TENT-03, D-12, D-15)', () => {
  test.use({
    extraHTTPHeaders: { Host: HOST },
  });

  test('/en/ renders the English home page with welcome text', async ({ page }) => {
    const response = await page.goto('/en/');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 });
  });

  test('/es/ renders the Spanish home page with Bienvenido text', async ({ page }) => {
    const response = await page.goto('/es/');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('text=Bienvenido')).toBeVisible({ timeout: 5000 });
  });

  test('root path / redirects to a locale prefix (localePrefix: "always")', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.url()).toMatch(/\/(en|es)\/?$/);
  });

  test('unknown host returns 404 Unknown tenant', async ({ request }) => {
    const res = await request.get('http://localhost:3000/en/', {
      headers: { Host: 'not-a-tenant.example.com' },
    });
    expect(res.status()).toBe(404);
  });
});
