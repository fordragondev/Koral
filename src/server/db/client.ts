import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { env } from '@/lib/env';

const queryClient = neon(env.DATABASE_URL);
export const db = drizzle(queryClient, { schema });

/**
 * THE ONLY approved path to run queries on tenant-scoped tables (Pitfall 1).
 *
 * Sets the `app.tenant_id` Postgres session variable so RLS policies (installed
 * post-Phase 1) can reference it. Even before RLS is enabled this wrapper is
 * enforced by convention — it is the contract downstream plans import.
 *
 * Implementation note: neon-http driver supports db.transaction() as of drizzle-orm 0.36+.
 * If "transactions not supported on neon-http" is encountered at runtime, fall back to
 * the inline-GUC variant (set_config without wrapping transaction). For neon-http,
 * each request is a short-lived connection so GUC state does not bleed across requests.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  // Use transaction to atomically set GUC then run fn.
  // neon-http transactions are batched in a single HTTP call.
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx as unknown as typeof db);
  });
}
