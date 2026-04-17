import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// These are grep-level tests — they assert the file CONTENT because the full Auth.js config
// object requires a running request context that's impractical to fake in a unit test.
// Integration tests live in Plan 06 (cross-tenant E2E).

describe('Auth.js v5 config (AUTH-01 through AUTH-05)', () => {
  const src = readFileSync('src/server/auth/config.ts', 'utf8');

  it('AUTH-01: uses 6-digit numeric OTP generator (D-08)', () => {
    expect(src).toMatch(/100000 \+ Math\.random\(\) \* 900000/);
    expect(src).toMatch(/generateVerificationToken/);
  });

  it('AUTH-02: configures Google OAuth provider', () => {
    expect(src).toMatch(/Google\(\{[\s\S]*GOOGLE_CLIENT_ID/);
  });

  it('AUTH-03: uses database session strategy (persists across refresh)', () => {
    expect(src).toMatch(/strategy:\s*['"]database['"]/);
  });

  it('AUTH-05 + Pitfall 3: cookie domain is derived from exact host, NOT a wildcard parent', () => {
    // Must reference host header
    expect(src).toMatch(/req\?\.headers\.get\(['"]host['"]\)/);
    // Must NOT contain a wildcard-parent pattern like domain: '.something.com'
    expect(src).not.toMatch(/domain:\s*['"]\./);
  });

  it('AUTH-05 + D-11: session and jwt callbacks inject tenantId from header', () => {
    expect(src).toMatch(/session\.tenantId\s*=\s*tenantId/);
    expect(src).toMatch(/token\.tenantId\s*=\s*tenantId/);
    expect(src).toMatch(/req\?\.headers\.get\(['"]x-tenant-id['"]\)/);
  });

  it('Pitfall 8: uses v5 functional config form NextAuth((req) => {...})', () => {
    expect(src).toMatch(/NextAuth\(\(req\)/);
  });

  it('Uses DrizzleAdapter with the Plan 02 db client', () => {
    expect(src).toMatch(/DrizzleAdapter\(db\)/);
  });

  it('Apple OAuth is conditionally included (stubbed when env vars absent)', () => {
    expect(src).toMatch(/Apple\(\{/);
    expect(src).toMatch(/APPLE_CLIENT_ID/);
    expect(src).toMatch(/APPLE_CLIENT_SECRET/);
  });

  it('OTP maxAge is set (short-lived token per T-04-04)', () => {
    expect(src).toMatch(/maxAge/);
  });

  it('Session strategy is database (AUTH-03)', () => {
    expect(src).toMatch(/session.*strategy.*database|strategy.*database/);
  });
});

describe('AUTH-04: signOutAction exists and is a Server Action', () => {
  const src = readFileSync('src/server/auth/actions.ts', 'utf8');
  it('is marked "use server"', () => {
    expect(src).toMatch(/^['"]use server['"]/m);
  });
  it('exports signOutAction calling signOut', () => {
    expect(src).toMatch(/export async function signOutAction/);
    expect(src).toMatch(/await signOut\(/);
  });
});

describe('Pitfall 8: route handler uses v5 export pattern', () => {
  const src = readFileSync('src/app/api/auth/[...nextauth]/route.ts', 'utf8');
  it('exports GET and POST from handlers', () => {
    expect(src).toMatch(/export const \{ GET, POST \} = handlers/);
  });
  it('does NOT use the v4 default export pattern', () => {
    expect(src).not.toMatch(/export default NextAuth/);
  });
});
