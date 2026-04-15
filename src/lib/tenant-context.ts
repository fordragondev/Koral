import { headers } from 'next/headers';
import { cache } from 'react';

/**
 * RSC-only helper. Reads x-tenant-id from the request headers stamped by
 * src/middleware.ts. Wrapped in React cache() so multiple Server Components
 * calling this in the same render get one header lookup, not N.
 *
 * NEVER read tenantId from query params, request body, or client-supplied
 * headers — only from the header set by Vercel-managed edge middleware (T-02-05).
 *
 * Next.js 15+: headers() is async — await it.
 */
export const getTenantId = cache(async (): Promise<string> => {
  const h = await headers();
  const tenantId = h.get('x-tenant-id');
  if (!tenantId) {
    throw new Error('No tenant context — middleware may not have run');
  }
  return tenantId;
});
