import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { withTenant } from '@/server/db/client';
import { tenants } from '@/server/db/schema';
import { getTenantId } from '@/lib/tenant-context';

/**
 * Reads the full tenant config row for the current request.
 *
 * Wrapped in React cache() so root layout and any RSC calling getTenant()
 * in the same render share a single DB round-trip.
 *
 * Uses withTenant() even for the tenants table itself to stay consistent with
 * the RLS pattern (T-02-01) — once RLS is installed in a post-Phase-1 plan,
 * this call will automatically be covered.
 *
 * Throws if the tenant row is not found (e.g. Edge Config has stale mapping).
 */
export const getTenant = cache(async () => {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, async (tx) =>
    tx.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1),
  );
  const tenant = rows[0];
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }
  return tenant;
});
