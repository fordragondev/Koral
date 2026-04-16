// server/tenant/edge-config-sync.ts
// Writes to Vercel Edge Config via REST API. NEVER call from middleware (Edge runtime).
// Call from a Server Action, Inngest job, or seed script ONLY.

type TenantEntry = { id: string; slug: string };

export async function syncTenantToEdgeConfig(tenant: {
  id: string;
  slug: string;
  domain: string;
}): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN;
  const edgeConfigId = process.env.VERCEL_EDGE_CONFIG_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !edgeConfigId) {
    // In local dev without Vercel credentials, log and skip — middleware uses a local dev shim.
    console.warn('[edge-config-sync] VERCEL_API_TOKEN or VERCEL_EDGE_CONFIG_ID not set — skipping');
    return;
  }

  // 1. Read current `tenants` value
  const readUrl = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items${teamId ? `?teamId=${teamId}` : ''}`;
  const readRes = await fetch(readUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!readRes.ok) throw new Error(`Edge Config read failed: ${readRes.status} ${await readRes.text()}`);
  const items = (await readRes.json()) as Array<{ key: string; value: unknown }>;
  const current = (items.find((i) => i.key === 'tenants')?.value as Record<string, TenantEntry> | undefined) ?? {};

  // 2. Patch in the new tenant
  const next: Record<string, TenantEntry> = {
    ...current,
    [tenant.domain]: { id: tenant.id, slug: tenant.slug },
  };

  // 3. PATCH the tenants key
  const patchUrl = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items${teamId ? `?teamId=${teamId}` : ''}`;
  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ operation: 'upsert', key: 'tenants', value: next }],
    }),
  });
  if (!patchRes.ok) throw new Error(`Edge Config write failed: ${patchRes.status} ${await patchRes.text()}`);
}
