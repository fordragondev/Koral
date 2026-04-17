// server/auth/config.ts — Auth.js v5 functional config (req-scoped, multi-tenant)
//
// CRITICAL CONSTRAINTS (from 01-PATTERNS.md and 01-RESEARCH.md):
// - Functional config form NextAuth((req) => { ... }) — NOT static object form (Pitfall 8)
// - tenantId derived ONLY from req.headers.get('x-tenant-id') — NEVER from client input (D-22)
// - Cookie domain set to exact request host — NEVER a wildcard parent (Pitfall 3)
// - 6-digit numeric OTP (D-08)
// - DrizzleAdapter(db) wires Auth.js to the Postgres DB

import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import Nodemailer from 'next-auth/providers/nodemailer';
import { db } from '@/server/db/client';
import { env } from '@/lib/env';
import { sendOtpEmail } from './email-sender';

export const { handlers, signIn, signOut, auth } = NextAuth((req) => {
  // D-11, T-04-01: ALWAYS derive tenantId from middleware header.
  // The middleware (Plan 03) stamps x-tenant-id from Edge Config — it is never client-supplied.
  const tenantId = req?.headers.get('x-tenant-id') ?? '';

  // T-04-02, Pitfall 3: cookie domain is the exact request host, NEVER a wildcard parent.
  // e.g. 'aquariumcommu.com' — NOT '.commu.com' or '.koral.com'
  const host = req?.headers.get('host')?.replace(/:\d+$/, '') ?? undefined;

  return {
    adapter: DrizzleAdapter(db),
    secret: env.NEXTAUTH_SECRET,
    // AUTH-03: database sessions persist across refresh (not JWT-only)
    session: { strategy: 'database' },
    providers: [
      // D-08: 6-digit numeric OTP — NOT a UUID magic link.
      // T-04-04: maxAge 600s (10-min window) limits brute-force surface.
      // T-04-05: Auth.js deletes tokens on successful verification (replay protection).
      // Provider import: next-auth/providers/nodemailer (preferred over deprecated /email).
      Nodemailer({
        generateVerificationToken: () =>
          Math.floor(100000 + Math.random() * 900000).toString(),
        sendVerificationRequest: async ({ identifier, token }) => {
          await sendOtpEmail(identifier, token);
        },
        maxAge: 10 * 60, // 10 minutes
      }),
      // AUTH-02: Google OAuth — per-tenant callback URL because each host is its own app
      Google({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      }),
      // AUTH-02: Apple OAuth — conditionally enabled (stubbed in dev per 01-VALIDATION Manual-Only)
      // T-04-06: Auth.js v5 enforces OAuth state + PKCE by default
      ...(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
        ? [
            Apple({
              clientId: env.APPLE_CLIENT_ID,
              clientSecret: env.APPLE_CLIENT_SECRET,
            }),
          ]
        : []),
    ],
    callbacks: {
      // D-11, AUTH-05: every session payload carries tenantId so callers can cross-verify
      async session({ session, ...rest }) {
        // session.tenantId = tenantId — injected from middleware header per D-11
        return { ...session, ...rest, tenantId } as typeof session & { tenantId: string };
      },
      // AUTH-05: JWT also carries tenantId for any JWT-consuming middleware
      async jwt({ token, ...rest }) {
        // token.tenantId = tenantId — mirrors session for JWT consistency
        return { ...token, ...rest, tenantId } as typeof token & { tenantId: string };
      },
    },
    cookies: {
      sessionToken: {
        // Cookie name includes tenantId to prevent accidental cross-tenant cookie collisions
        name: `__Secure-koral.session-token-${tenantId || 'unknown'}`,
        options: {
          // Pitfall 3: exact tenant host ONLY — never a wildcard parent domain like '.commu.com'
          domain: host,
          httpOnly: true,
          sameSite: 'lax' as const,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
        },
      },
    },
  };
});
