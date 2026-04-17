/**
 * E2E auth tests for Phase 1 correctness proofs.
 *
 * Prerequisites (manual setup required — tests will NOT pass without these):
 * 1. DATABASE_URL env var pointing to a running Postgres instance
 * 2. pnpm seed:tenants must have run (inserts aquariumcommu.com + anime.test.koral.local)
 * 3. /etc/hosts (or C:\Windows\System32\drivers\etc\hosts on Windows) must contain:
 *      127.0.0.1 aquariumcommu.com
 *      127.0.0.1 anime.test.koral.local
 * 4. Dev server running: pnpm dev
 *
 * These tests run against the full dev server and require a seeded DB.
 * They will fail in CI without the above setup.
 */

import { test, expect, type BrowserContext } from '@playwright/test';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import * as schema from '../../src/server/db/schema';
import { tenants, users, sessions } from '../../src/server/db/schema';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL required for E2E tests');
const db = drizzle(neon(dbUrl), { schema });

const AQUARIUM = 'aquariumcommu.com';
const ANIME = 'anime.test.koral.local';

async function seedUserAndSession(domain: string, email: string) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.domain, domain))
    .limit(1);
  if (!tenant) throw new Error(`Seed a tenant for ${domain} first (pnpm seed:tenants)`);

  // Look up existing user scoped to this tenant
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email,
        displayName: 'E2E Test User',
      })
      .returning();
  }

  const sessionToken = randomUUID();
  await db.insert(sessions).values({
    sessionToken,
    userId: user!.id,
    tenantId: tenant.id,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  });

  return { tenant, user: user!, sessionToken };
}

async function setSessionCookie(
  context: BrowserContext,
  domain: string,
  sessionToken: string,
  tenantId: string,
) {
  // Cookie name matches the pattern from src/server/auth/config.ts:
  // `__Secure-koral.session-token-${tenantId}` in production
  // In non-HTTPS local dev, __Secure- prefix cannot be set — use the base name.
  const baseName = `koral.session-token-${tenantId}`;
  await context.addCookies([
    {
      name: baseName,
      value: sessionToken,
      domain, // exact host — proves Pitfall 3 mitigation
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 3600,
    },
  ]);
}

test.describe('AUTH-05 / TENT-02: cross-tenant session isolation (Pitfall 3)', () => {
  test(
    'session cookie set on aquariumcommu.com does NOT authenticate anime.test.koral.local',
    async ({ browser }) => {
      const { tenant: aquariumTenant, sessionToken: aquariumToken } =
        await seedUserAndSession(AQUARIUM, 'silo-test@example.com');

      const context = await browser.newContext();
      await setSessionCookie(context, AQUARIUM, aquariumToken, aquariumTenant.id);

      const animePage = await context.newPage();

      // anime tenant must NOT see aquarium session
      const animeRes = await animePage.request.get(
        `http://${ANIME}:3000/api/auth/session`,
        { headers: { Host: ANIME } },
      );
      const animeBody = await animeRes.json().catch(() => ({}));
      expect(animeBody?.user, 'anime tenant must NOT see aquarium session').toBeFalsy();

      // aquarium's own session endpoint SHOULD see the session
      const aquariumRes = await animePage.request.get(
        `http://${AQUARIUM}:3000/api/auth/session`,
        { headers: { Host: AQUARIUM } },
      );
      const aquariumBody = await aquariumRes.json().catch(() => ({}));
      expect(aquariumBody?.user, 'aquarium tenant must see its own session').toBeTruthy();

      await context.close();
    },
  );
});

test.describe('AUTH-04: sign-out clears session', () => {
  test.use({ extraHTTPHeaders: { Host: AQUARIUM } });

  test('signing out removes the session cookie and Navbar shows sign-in link', async ({
    browser,
  }) => {
    const { tenant, sessionToken } = await seedUserAndSession(
      AQUARIUM,
      'signout-test@example.com',
    );
    const context = await browser.newContext({
      extraHTTPHeaders: { Host: AQUARIUM },
    });
    await setSessionCookie(context, AQUARIUM, sessionToken, tenant.id);
    const page = await context.newPage();

    await page.goto('/en/');
    // Navbar should show sign-out button (not sign-in link)
    await expect(page.getByText('Sign out')).toBeVisible({ timeout: 5000 });

    // Click sign-out
    await page.getByText('Sign out').click();
    await page.waitForURL(/\/(en|es)?\/?$/);

    // After sign-out the sign-in link must appear
    await expect(page.getByText('Sign in')).toBeVisible({ timeout: 5000 });

    // And /api/auth/session returns null
    const res = await page.request.get('/api/auth/session');
    const body = await res.json().catch(() => ({}));
    expect(body?.user).toBeFalsy();

    await context.close();
  });
});

test.describe('AUTH-01: sign-in form accepts email and shows confirmation', () => {
  test.use({ extraHTTPHeaders: { Host: AQUARIUM } });

  test('submitting valid email shows "code sent" confirmation', async ({ page }) => {
    await page.goto('/en/sign-in');
    await page.getByLabel('Email').fill('otp-ui-test@example.com');
    await page.getByText('Send code').click();
    await expect(page.getByText(/code/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('AUTH-02: Google OAuth redirect initiates correctly', () => {
  test.use({ extraHTTPHeaders: { Host: AQUARIUM } });

  test(
    'clicking "Continue with Google" redirects toward accounts.google.com',
    async ({ page }) => {
      // We cannot complete a real OAuth callback in CI (no credentials), but we CAN verify:
      // 1. The sign-in page renders the Google button
      // 2. Clicking it triggers Auth.js's authorization_url endpoint
      // 3. Auth.js responds with a redirect toward accounts.google.com
      await page.goto('/en/sign-in');
      await expect(page.getByText('Continue with Google')).toBeVisible({ timeout: 5000 });

      // Intercept the navigation triggered by clicking the Google button
      const [response] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.url().includes('/api/auth/signin/google') ||
            res.url().includes('accounts.google.com') ||
            res.url().includes('oauth2.googleapis.com'),
          { timeout: 10000 },
        ),
        page.getByText('Continue with Google').click(),
      ]);

      // Auth.js either redirects directly (302) to Google or returns a JSON with url field
      const status = response.status();
      expect([200, 302, 303]).toContain(status);

      // If 200, the body should include the Google authorization URL
      if (status === 200) {
        const body = await response.json().catch(() => ({}));
        expect(body.url ?? '').toMatch(/google|accounts\./i);
      }
    },
  );
});
