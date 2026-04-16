import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { testDb, resetTestDb, seedTwoTenants } from '../helpers/db';
import { users } from '@/server/db/schema';

/**
 * Integration tests proving the per-domain account silo model at the DB layer.
 *
 * Requires DATABASE_URL pointing to a real Neon Postgres instance.
 * Run after `pnpm db:push` to ensure tables + constraints exist.
 *
 * Validates: AUTH-05, TENT-02, HIER-01 (Pitfall 2 protection)
 */
describe('Schema constraints (Pitfall 2 — per-domain silo)', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await resetTestDb();
  });

  it('allows the same email on two different tenants (silo success path)', async () => {
    const { tenantA, tenantB } = await seedTwoTenants();

    await testDb.insert(users).values({
      tenantId: tenantA.id,
      email: 'shared@example.com',
      displayName: 'User on Aquarium',
    });
    await testDb.insert(users).values({
      tenantId: tenantB.id,
      email: 'shared@example.com',
      displayName: 'User on Anime',
    });

    const rows = await testDb.select().from(users);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.tenantId))).toEqual(
      new Set([tenantA.id, tenantB.id]),
    );
  });

  it('rejects a duplicate email within the SAME tenant (silo constraint fires)', async () => {
    const { tenantA } = await seedTwoTenants();

    await testDb.insert(users).values({
      tenantId: tenantA.id,
      email: 'dup@example.com',
      displayName: 'first',
    });

    await expect(
      testDb.insert(users).values({
        tenantId: tenantA.id,
        email: 'dup@example.com',
        displayName: 'second',
      }),
    ).rejects.toThrow(/users_tenant_id_email_unique|duplicate key/i);
  });

  it('verifies all 7 Phase 1 tables exist in the live database', async () => {
    const result = await testDb.execute<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'` as any,
    );
    const names = new Set(
      (result as unknown as Array<{ table_name: string }>).map((r) => r.table_name),
    );
    for (const t of [
      'tenants',
      'users',
      'accounts',
      'sessions',
      'verification_tokens',
      'groups',
      'group_members',
    ]) {
      expect(names.has(t)).toBe(true);
    }
  });
});
