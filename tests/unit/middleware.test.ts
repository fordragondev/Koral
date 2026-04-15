import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @vercel/edge-config BEFORE importing middleware
vi.mock('@vercel/edge-config', () => ({
  get: vi.fn(),
}));
// Mock next-intl middleware to return a passthrough NextResponse
vi.mock('next-intl/middleware', () => ({
  default: () => (req: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.next();
  },
}));

import { get } from '@vercel/edge-config';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

const TENANT_A = { id: '00000000-0000-0000-0000-00000000000a', slug: 'aquarium' };

function makeReq(host: string, path = '/en/') {
  const url = `https://${host}${path}`;
  return new NextRequest(url, { headers: { host } });
}

describe('middleware (TENT-01, TENT-04)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stamps x-tenant-id and x-tenant-slug for a known host', async () => {
    (get as any).mockResolvedValueOnce({ 'aquariumcommu.com': TENANT_A });
    const res = await middleware(makeReq('aquariumcommu.com'));
    expect(res.headers.get('x-tenant-id')).toBe(TENANT_A.id);
    expect(res.headers.get('x-tenant-slug')).toBe('aquarium');
  });

  it('strips port and www. prefix when matching the host', async () => {
    (get as any).mockResolvedValueOnce({ 'aquariumcommu.com': TENANT_A });
    const res = await middleware(makeReq('www.aquariumcommu.com:3000'));
    expect(res.headers.get('x-tenant-id')).toBe(TENANT_A.id);
  });

  it('returns 404 Unknown tenant for an unregistered host', async () => {
    (get as any).mockResolvedValueOnce({ 'aquariumcommu.com': TENANT_A });
    const res = await middleware(makeReq('not-a-tenant.example.com'));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Unknown tenant');
  });
});

import { readFileSync } from 'node:fs';
describe('middleware Edge runtime safety (Pitfall 4)', () => {
  it('imports nothing from drizzle, neondatabase, or node built-ins', () => {
    const src = readFileSync('src/middleware.ts', 'utf8');
    expect(src).not.toMatch(/from ['"]drizzle-orm/);
    expect(src).not.toMatch(/from ['"]@neondatabase\/serverless/);
    expect(src).not.toMatch(/from ['"]node:/);
    expect(src).not.toMatch(/from ['"]@\/server\/db/);
  });
});
