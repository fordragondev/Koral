import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncTenantToEdgeConfig } from '@/server/tenant/edge-config-sync';

describe('syncTenantToEdgeConfig (TENT-04)', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_API_TOKEN', 'test-token');
    vi.stubEnv('VERCEL_EDGE_CONFIG_ID', 'ecfg_test');
    vi.unstubAllGlobals();
  });

  it('reads current tenants then PATCHes with the new entry merged in', async () => {
    const fetchMock = vi.fn()
      // 1st call: read items
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ key: 'tenants', value: { 'existing.com': { id: 'x', slug: 'x' } } }],
      })
      // 2nd call: patch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await syncTenantToEdgeConfig({ id: 'new-id', slug: 'newslug', domain: 'aquariumcommu.com' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const patchCall = fetchMock.mock.calls[1]!;
    expect(patchCall[1].method).toBe('PATCH');
    const body = JSON.parse(patchCall[1].body as string);
    expect(body.items[0].key).toBe('tenants');
    expect(body.items[0].value['aquariumcommu.com']).toEqual({ id: 'new-id', slug: 'newslug' });
    expect(body.items[0].value['existing.com']).toEqual({ id: 'x', slug: 'x' }); // existing preserved
  });

  it('skips silently when VERCEL_API_TOKEN is missing (local dev)', async () => {
    vi.stubEnv('VERCEL_API_TOKEN', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await syncTenantToEdgeConfig({ id: 'x', slug: 'x', domain: 'x' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
