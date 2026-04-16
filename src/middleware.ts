import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

type TenantEntry = { id: string; slug: string };

export async function middleware(req: NextRequest) {
  // Step 1 (Pitfall 4): Edge runtime safe — Edge Config read only.
  // Strip port and `www.` prefix so localhost:3000 and www.aquariumcommu.com resolve correctly.
  const host = req.headers.get('host')?.replace(/:\d+$/, '').replace(/^www\./, '') ?? '';
  const tenantMap = await get<Record<string, TenantEntry>>('tenants');
  const tenant = tenantMap?.[host];
  if (!tenant) {
    return new NextResponse('Unknown tenant', { status: 404 });
  }

  // Step 2 (Pitfall 5): tenant resolved FIRST, then delegate locale routing to next-intl.
  const res = intlMiddleware(req);

  // Step 3: stamp tenant headers on the response so RSC and Route Handlers can read them via headers().
  res.headers.set('x-tenant-id', tenant.id);
  res.headers.set('x-tenant-slug', tenant.slug);
  return res;
}

export const config = {
  matcher: ['/((?!_next|_vercel|api/auth|.*\\..*).*)'],
};
