// Two-tenant isolation fixture — implemented fully in Plan 02 after schema exists.
export async function seedTwoTenants(): Promise<{ tenantA: string; tenantB: string }> {
  throw new Error('Not implemented — filled in when schema.ts lands (Plan 02)');
}

export async function resetTestDb(): Promise<void> {
  throw new Error('Not implemented — filled in when schema.ts lands (Plan 02)');
}
