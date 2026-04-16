import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from '@/server/db/schema';
import { tenants, users } from '@/server/db/schema';

const client = neon(process.env.DATABASE_URL!);
export const testDb = drizzle(client, { schema });

/**
 * Truncates all test tables in FK-safe order (children before parents).
 * Call in beforeEach / afterAll to keep tests hermetic.
 */
export async function resetTestDb(): Promise<void> {
  await testDb.execute(
    sql`TRUNCATE TABLE group_members, groups, sessions, accounts, verification_tokens, users, tenants RESTART IDENTITY CASCADE`,
  );
}

/**
 * Seeds two independent tenant rows used to prove the per-domain silo model.
 * Plans 03–05 reuse this fixture in auth and middleware tests.
 */
export async function seedTwoTenants(): Promise<{
  tenantA: { id: string; domain: string };
  tenantB: { id: string; domain: string };
}> {
  const [a] = await testDb
    .insert(tenants)
    .values({
      slug: 'aquarium-test',
      domain: 'aquarium.test',
      name: 'Aquarium Test',
      themeLight: {},
      themeDark: {},
      defaultLocale: 'en',
    })
    .returning({ id: tenants.id, domain: tenants.domain });

  const [b] = await testDb
    .insert(tenants)
    .values({
      slug: 'anime-test',
      domain: 'anime.test',
      name: 'Anime Test',
      themeLight: {},
      themeDark: {},
      defaultLocale: 'en',
    })
    .returning({ id: tenants.id, domain: tenants.domain });

  return { tenantA: a!, tenantB: b! };
}
