// scripts/seed-tenants.ts
// Run with: pnpm seed:tenants
// Inserts/updates two tenants in DB and mirrors them to Edge Config.

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { tenants } from '../src/server/db/schema';
import { syncTenantToEdgeConfig } from '../src/server/tenant/edge-config-sync';

// EXACT aquarium tokens from 01-UI-SPEC.md Color section
const AQUARIUM_THEME_DARK = {
  bg: '#0a1628',
  surface: '#0f2240',
  accent: '#00bcd4',
  accentHover: '#00acc1',
  fg: '#e6f4f8',
  primary: '#00bcd4',
};
const AQUARIUM_THEME_LIGHT = {
  bg: '#f0f9fc',
  surface: '#ffffff',
  accent: '#00838f',
  accentHover: '#006978',
  fg: '#0a1628',
  primary: '#00838f',
};

const SEED = [
  {
    slug: 'aquarium',
    domain: 'aquariumcommu.com',
    name: 'Aquarium Community',
    defaultLocale: 'en',
    themeLight: AQUARIUM_THEME_LIGHT,
    themeDark: AQUARIUM_THEME_DARK,
    tagline: 'A home for passionate aquarists',
    isActive: true,
  },
  {
    // Second tenant for cross-tenant isolation tests in Plan 06
    slug: 'anime',
    domain: 'anime.test.koral.local',
    name: 'Anime Test',
    defaultLocale: 'en',
    themeLight: { ...AQUARIUM_THEME_LIGHT, accent: '#e91e63', primary: '#e91e63' },
    themeDark: { ...AQUARIUM_THEME_DARK, accent: '#e91e63', primary: '#e91e63' },
    tagline: 'Test tenant — do not use in prod',
    isActive: true,
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL required to seed tenants');
  }
  const db = drizzle(neon(process.env.DATABASE_URL));

  for (const t of SEED) {
    const existing = await db.select().from(tenants).where(eq(tenants.domain, t.domain)).limit(1);
    let row;
    if (existing.length === 0) {
      [row] = await db.insert(tenants).values(t as any).returning();
      console.log(`[seed] inserted tenant ${t.domain} → ${row!.id}`);
    } else {
      [row] = await db
        .update(tenants)
        .set({ ...t, themeLight: t.themeLight as any, themeDark: t.themeDark as any })
        .where(eq(tenants.domain, t.domain))
        .returning();
      console.log(`[seed] updated tenant ${t.domain} → ${row!.id}`);
    }
    await syncTenantToEdgeConfig({ id: row!.id, slug: row!.slug, domain: row!.domain });
    console.log(`[seed] synced ${t.domain} to Edge Config`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
