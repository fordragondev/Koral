# Phase 1: Foundation - Research

**Researched:** 2026-04-14
**Domain:** Next.js 15 App Router + Auth.js v5 + Drizzle ORM + Neon Postgres + next-intl + Tailwind CSS v4 + Vercel Edge Config (multi-tenant foundation)
**Confidence:** HIGH — stack is locked in CLAUDE.md, architecture patterns are well-established, versions verified against npm registry.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Logged-out Experience**
- D-01: Full read access without sign-in. Visitors can browse the feed, read articles, and view discussions.
- D-02: Sign-in is only required to create content, comment, react, or join groups.
- D-03: This is essential for SEO — content pages must be publicly accessible and server-rendered.

**Sign-in / OTP Flow**
- D-04: Passwordless only — no email/password login. Auth is via 6-digit email OTP code or OAuth (Google / Apple).
- D-05: Single unified flow for both sign-in and sign-up. User enters their email; if account exists they receive a code, if not the account is silently created and they receive a code. No separate "Register" page.
- D-06: "Code on first visit" model: after first successful auth, the session/cookie persists on that device.
- D-07: On a new device (or expired session), the OTP code flow re-runs.
- D-08: OTP code input uses a 6-digit segmented input with auto-advance between digit fields.
- D-09: OAuth (Google / Apple) is available at all times as an alternative to OTP.

**Account Silos**
- D-10: Auth is fully per-domain. Same email creates independent, unlinked accounts on each vertical.
- D-11: Enforced at DB schema level (UNIQUE(tenant_id, email)), session level (session cookie carries tenant_id), and middleware level.

**Language Switching (i18n)**
- D-12: Browser language detection on first visit — Spanish (es, es-*) → /es/, otherwise → /en/.
- D-13: Language toggle visible in nav bar at all times.
- D-14: After sign-in, preferred language saved to account and restored on next visit.
- D-15: URL path prefix for locale: aquariumcommu.com/en/feed and aquariumcommu.com/es/feed. Cookie-only locale storage explicitly rejected.
- D-16: Locale resolution priority: URL prefix → cookie → Accept-Language header → tenant default locale (English).
- D-17: No machine translation. Untranslated strings fall back to English visually during development.

**Per-Vertical Branding**
- D-18: Branding is fully config-driven. A tenants table row defines all visual identity — no code changes to spin up a new vertical.
- D-19: v1 branding scope: color palette (primary + accent, CSS custom properties), logo + favicon, homepage hero/background imagery, custom tagline + copy.
- D-20: Branding applied via CSS custom properties on root layout.
- D-21: aquariumcommu.com: deep ocean — dark + teal/cyan. Dark (deep water) and light (bright reef). Both intentionally designed.

**Dark / Light Mode**
- D-27: Both dark and light modes from Phase 1. Not optional.
- D-28: Default on first visit: follow OS/system preference (prefers-color-scheme).
- D-29: User toggles dark/light via sun/moon icon in nav bar, alongside EN | ES toggle.
- D-30: Preference saved to localStorage immediately. On sign-in, syncs to account.
- D-31: Implemented via data-theme attribute on <html>. CSS custom properties define color tokens for both modes.

**Tenant Routing**
- D-22: Host → tenant resolution in Next.js Edge Middleware using Vercel Edge Config (sub-ms read), stamps x-tenant-id.
- D-23: All Drizzle queries run through a tenantDb(tenantId) wrapper. No raw queries bypassing this.
- D-24: New verticals activated by adding a DB row + Edge Config entry — no code deployment.

**Product Hierarchy Schema**
- D-25: 4-tier hierarchy (Community → Groups → Verified Creators → Members) baked into DB schema in Phase 1.
- D-26: Reputation loop (points, auto-promotion, badges) ships in Phase 3. Phase 1 columns can be nullable/zero-defaulted.

**Group Model**
- D-32: No geographic groups. Groups are interest/activity based, not geographic containers.
- D-33: Groups: "Planted Tank Enthusiasts", "Saltwater Beginners", etc. Location is optional on a group, not required.
- D-34: Geography is a property of events only.
- D-35: Any member can create a group. Groups have: name, description, optional location, cover photo, and a dedicated chat room.
- D-36: groups table location is nullable. Overrides GRP-01 in REQUIREMENTS.md.

### Claude's Discretion
- Auth.js v5 specific session configuration and cookie settings
- Exact Drizzle schema structure (table names, column types, index strategy)
- Edge Config data structure for tenant registry
- OTP code expiry window and rate limiting thresholds
- Vercel environment variable naming conventions
- Loading/skeleton states during tenant resolution

### Deferred Ideas (OUT OF SCOPE)
- None surfaced during discussion — conversation stayed within Phase 1 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign in via email OTP code (passwordless) | Auth.js v5 Email provider with custom OTP flow; Drizzle adapter stores verification tokens scoped to tenant |
| AUTH-02 | User can sign in via OAuth (Google or Apple) | Auth.js v5 Google/Apple providers; OAuth callback URLs are per-tenant domain; user_identities table maps provider_sub per tenant |
| AUTH-03 | User session persists across browser refresh | Auth.js v5 database sessions (not JWT-only); session cookie domain locked to tenant domain |
| AUTH-04 | User can sign out from any page | Auth.js signOut() call from any layout; server-side session invalidation |
| AUTH-05 | Auth is fully siloed per domain — same email creates independent accounts on each vertical | UNIQUE(tenant_id, email) composite constraint; tenantId in session JWT; middleware validates session.tenantId === request tenant |
| TENT-01 | Each hobby vertical served from its own domain with per-vertical branding | Edge middleware host→tenant resolution; CSS custom properties from tenant config; config-driven logo/colors/favicon |
| TENT-02 | User accounts siloed per domain — same email creates independent accounts per vertical | Same mechanism as AUTH-05; enforced at schema + session + middleware layers |
| TENT-03 | Platform UI fully bilingual (English and Spanish) from launch | next-intl v4 with /en/ and /es/ path prefixes; no hardcoded strings; ICU message format |
| TENT-04 | New verticals activated via configuration (no code changes required) | Tenants table + Edge Config entry; domain added to Vercel project; branding fully in DB config row |
| HIER-01 | Platform has 4-tier hierarchy: Community → Local Groups → Verified Creators → Members | Schema tables for communities (=tenants), groups, users with role/tier columns; nullable/zero-defaulted reputation columns until Phase 3 |
</phase_requirements>

---

## Summary

Phase 1 establishes the foundation that every subsequent phase builds on: a working Next.js 15 App Router application deployed to Vercel with per-domain multi-tenant routing, per-domain account silos enforced at the schema and session level, bilingual EN/ES routing with path-based locale prefixes, config-driven per-vertical branding with dark/light mode support, and the full 4-tier product hierarchy schema — even though only the scaffolding is used in this phase.

The stack is locked and well-matched to the requirements. The three highest-risk areas in Phase 1 are: (1) Auth.js v5's multi-tenant silo pattern, which requires careful cookie domain configuration and tenant-scoped session verification that is easy to get subtly wrong; (2) the next-intl + tenant middleware composition, where two middleware concerns must be composed without interference; and (3) the Drizzle tenantDb() wrapper pattern, which must be established before any feature work begins since retrofitting it later is expensive.

This is a greenfield project with a single codebase file (CLAUDE.md) and no existing code. Every pattern established in Phase 1 becomes a convention that all 5 subsequent phases follow. Getting the middleware, schema, and auth patterns right here is significantly cheaper than fixing them later.

**Primary recommendation:** Build in this strict order: project scaffold → schema + migrations → Edge middleware → tenant resolution + Edge Config → Auth.js v5 + OTP flow → OAuth → next-intl setup → theming system → dark/light mode. Do not begin auth work until the middleware tenant resolution is proven correct, and do not begin feature work until a two-tenant isolation test passes.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Host → tenant resolution | Edge Middleware | — | Must happen before any request reaches a page; Edge Config provides sub-ms reads without DB |
| Locale detection and URL rewriting | Edge Middleware | Frontend Server (SSR) | Middleware handles path-prefix detection and redirect; next-intl handles message loading in RSC |
| Per-tenant CSS theming | Frontend Server (SSR) | Browser/Client | Root layout injects CSS custom properties from tenant config; Tailwind consumes them at class-evaluation time |
| Dark/light mode toggle | Browser/Client | Frontend Server (SSR) | Initial preference read from localStorage/OS; synced to DB on sign-in via Server Action |
| Authentication (OTP + OAuth) | API / Backend (Server Actions + Route Handlers) | — | Auth.js v5 runs on Node runtime; session validation in Server Components; cookie set by Next.js auth handler |
| Session persistence | API / Backend | Database / Storage | Auth.js database sessions stored in Postgres via Drizzle adapter; cookie domain locked to tenant |
| Account silo enforcement | Database / Storage | API / Backend | UNIQUE(tenant_id, email) is the hard constraint; middleware and session checks are defense-in-depth |
| 4-tier hierarchy data model | Database / Storage | — | Schema-only in Phase 1; UI activation deferred to Phase 3 |
| Tenant config / branding data | Database / Storage | CDN / Edge | Tenants table is source of truth; mirrored to Edge Config for middleware reads |
| Language toggle UI | Browser/Client | — | Client component in nav bar; writes locale cookie + calls Server Action to persist to account |
| i18n message loading | Frontend Server (SSR) | — | next-intl getTranslations() in RSC; never hardcode locale |

---

## Standard Stack

### Core (Phase 1 scope only)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | `16.2.3` | App Router, SSR, Edge Middleware, API Routes | [VERIFIED: npm registry] App Router is the required foundation for RSC, Server Actions, and edge middleware |
| React | `19.2.5` | UI runtime | [VERIFIED: npm registry] Required by Next.js 15/16; brings useOptimistic and improved Suspense |
| TypeScript | `6.0.2` | Type safety | [VERIFIED: npm registry] Non-negotiable for solo dev; Drizzle and Auth.js ship strict types |
| Drizzle ORM | `0.45.2` | SQL query builder + migrations | [VERIFIED: npm registry] Chosen over Prisma — thin layer, no engine binary, works cleanly on Neon serverless HTTP driver |
| `@neondatabase/serverless` | `1.0.2` | Postgres HTTP/WS driver | [VERIFIED: npm registry] Required for Vercel serverless — avoids persistent connection pool exhaustion |
| Auth.js (next-auth) | `4.24.14` | Authentication | [VERIFIED: npm registry] **Note: current npm latest is v4; v5 beta is published as `next-auth@beta`.** Install with `next-auth@beta` to get v5 App Router support |
| `@auth/drizzle-adapter` | `1.11.2` | Auth.js → Drizzle bridge | [VERIFIED: npm registry] Persists sessions/users/accounts to Drizzle schema |
| next-intl | `4.9.1` | i18n EN/ES | [VERIFIED: npm registry] v4 has full App Router support; path-based locale routing; typed messages |
| Tailwind CSS | `4.2.2` | Styling + theming | [VERIFIED: npm registry] v4 Oxide engine; @theme directive for CSS custom property integration |
| `@vercel/edge-config` | `1.4.3` | Tenant registry reads at edge | [VERIFIED: npm registry] Sub-ms reads at edge; no DB query in middleware |
| zod | `4.3.6` | Runtime validation | [VERIFIED: npm registry] Validates Server Action inputs, tenant config, env vars |
| `@t3-oss/env-nextjs` | `0.13.11` | Typed env vars | [VERIFIED: npm registry] Catches missing envs at build time |

### Supporting (Phase 1 scope)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `drizzle-kit` | matches drizzle | Schema migrations | Dev-time only; `drizzle-kit push` and `drizzle-kit migrate` |
| `react-hook-form` | `7.72.1` | Forms | OTP input form, sign-in form; pairs with Zod resolvers |
| `@hookform/resolvers` | latest | Zod ↔ RHF bridge | Always with react-hook-form |
| `lucide-react` | `1.8.0` | Icons | [VERIFIED: npm registry] Sun/moon toggle, language toggle icons |
| `date-fns` | `4.1.0` | Date formatting | [VERIFIED: npm registry] EN/ES locale support |
| `@sentry/nextjs` | `10.48.0` | Error tracking | [VERIFIED: npm registry] Install from Phase 1; catches middleware and Server Action errors |
| Vitest | `4.1.4` | Unit + integration tests | [VERIFIED: npm registry] Faster than Jest; native ESM |
| Playwright | `1.59.1` | E2E tests | [VERIFIED: npm registry] Cross-tenant session isolation tests |

### Version Notes

> **Important:** The `next-auth@beta` package installs Auth.js v5. The stable `next-auth@4.x` (latest: 4.24.14) does NOT support Next.js App Router Server Actions natively. Always install with `pnpm add next-auth@beta`.
> Next.js version from npm is `16.2.3` — this supersedes the `15.x` referenced in prior research artifacts. Verify App Router feature set is unchanged.

### Installation (Phase 1 only)

```bash
# Initialize project
pnpm create next-app@latest koral --typescript --tailwind --app --src-dir --import-alias "@/*"

# Data layer
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit

# Auth (v5 beta — required for App Router)
pnpm add next-auth@beta @auth/drizzle-adapter

# Edge Config (tenant registry)
pnpm add @vercel/edge-config

# i18n
pnpm add next-intl

# Forms + validation + env
pnpm add zod react-hook-form @hookform/resolvers @t3-oss/env-nextjs

# UI utilities
pnpm add class-variance-authority clsx tailwind-merge lucide-react date-fns

# shadcn/ui (after Tailwind v4 config is in place)
pnpm dlx shadcn@latest init

# Observability (install now, configure later)
pnpm add @sentry/nextjs

# Dev tooling
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
pnpm add -D @playwright/test
```

---

## Architecture Patterns

### System Architecture Diagram

```
Browser request (aquariumcommu.com/en/...)
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  VERCEL EDGE                                            │
│  middleware.ts                                          │
│    1. Read Host header → Edge Config → tenant_id        │
│    2. Detect locale (URL path → cookie → Accept-Lang)   │
│    3. Validate: no locale prefix → prepend /en/ or /es/ │
│    4. Set x-tenant-id, x-tenant-slug, x-locale headers  │
│    5. NextResponse.rewrite() to internal path           │
└───────────────────────────┬─────────────────────────────┘
                            │ rewritten request + injected headers
                            ▼
┌─────────────────────────────────────────────────────────┐
│  NEXT.JS APP ROUTER (Node runtime)                      │
│                                                         │
│  Root Layout                                            │
│    → reads x-tenant-id from headers()                   │
│    → fetches tenant config from DB (Drizzle)            │
│    → injects <style>:root { CSS custom properties }</style>│
│    → renders <html data-theme="dark|light">             │
│    → wraps with next-intl NextIntlClientProvider        │
│                                                         │
│  Auth Routes (/api/auth/[...nextauth])                  │
│    → Auth.js v5 handler                                 │
│    → OTP: Email provider → 6-digit code → verify        │
│    → OAuth: Google / Apple → per-tenant callback URL    │
│    → Session: database sessions via Drizzle adapter     │
│    → Cookie domain locked to tenant host                │
│                                                         │
│  Protected Server Actions                               │
│    → read x-tenant-id from headers()                    │
│    → verify session.tenantId === request tenantId       │
│    → all DB calls through tenantDb(tenantId) wrapper    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  DATA LAYER                                             │
│                                                         │
│  Neon Postgres (via @neondatabase/serverless HTTP)      │
│    → tenants table (source of truth for registry)       │
│    → users UNIQUE(tenant_id, email)                     │
│    → sessions (Auth.js DB sessions)                     │
│    → groups, community_tiers (hierarchy scaffold)       │
│    → RLS: tenant_isolation policy on every table        │
│                                                         │
│  Vercel Edge Config                                     │
│    → mirror of tenants table (domain → tenant_id map)   │
│    → updated on tenant row insert/update                │
└─────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── app/
│   ├── [locale]/                 # locale-prefixed routes (next-intl)
│   │   ├── layout.tsx            # authenticated app shell
│   │   ├── page.tsx              # home / feed placeholder
│   │   └── (auth)/
│   │       ├── sign-in/page.tsx  # OTP + OAuth sign-in
│   │       └── verify/page.tsx   # OTP code entry
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/route.ts  # Auth.js handler
│   └── layout.tsx                # root layout — tenant theme injection
├── server/
│   ├── db/
│   │   ├── client.ts             # Neon serverless client + tenantDb() wrapper
│   │   ├── schema.ts             # Drizzle schema (all tables)
│   │   └── migrations/           # drizzle-kit output
│   ├── auth/
│   │   └── config.ts             # Auth.js config (providers, callbacks, adapter)
│   └── tenant/
│       ├── resolve.ts            # getTenant() helper from headers()
│       └── edge-config-sync.ts   # sync tenants table → Edge Config
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── auth/
│   │   ├── OtpInput.tsx          # 6-digit segmented input
│   │   ├── SignInForm.tsx        # unified sign-in/sign-up form
│   │   └── OAuthButtons.tsx     # Google / Apple buttons
│   └── layout/
│       ├── Navbar.tsx            # nav with lang toggle + dark/light toggle
│       ├── LangToggle.tsx        # EN | ES text toggle
│       └── ThemeToggle.tsx       # sun/moon icon toggle
├── lib/
│   ├── tenant-context.ts         # headers() → tenant accessor (RSC-safe)
│   └── env.ts                    # @t3-oss/env-nextjs config
├── i18n/
│   ├── request.ts                # next-intl request config
│   └── routing.ts                # next-intl routing config
├── messages/
│   ├── en/
│   │   ├── common.json
│   │   ├── nav.json
│   │   └── auth.json
│   └── es/
│       ├── common.json
│       ├── nav.json
│       └── auth.json
├── styles/
│   └── globals.css               # Tailwind v4 + CSS custom property tokens
└── middleware.ts                 # tenant + locale resolution
```

### Pattern 1: Tenant-Scoped DB Wrapper

**What:** Every Drizzle query is wrapped in a helper that sets the Postgres RLS session variable.
**When to use:** Every DB access in Server Components, Server Actions, and Route Handlers — no exceptions.

```typescript
// server/db/client.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

const queryClient = neon(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { schema });

// Use this for every query that touches tenant-scoped tables
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx);
  });
}
```

Source: [CITED: ARCHITECTURE.md Section 2, PITFALLS.md Pitfall 1]

### Pattern 2: Middleware Composition (tenant + locale)

**What:** Single middleware.ts that resolves tenant from Edge Config then delegates locale to next-intl.
**When to use:** Always. Keep middleware lean — no DB, no Node APIs.

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(req: NextRequest) {
  // Step 1: resolve tenant (Edge runtime safe — Edge Config only, no DB)
  const host = req.headers.get('host')?.replace(/:\d+$/, '').replace(/^www\./, '') ?? '';
  const tenantMap = await get<Record<string, { id: string; slug: string }>>('tenants');
  const tenant = tenantMap?.[host];
  if (!tenant) return new NextResponse('Unknown tenant', { status: 404 });

  // Step 2: delegate locale routing to next-intl
  const res = intlMiddleware(req);

  // Step 3: stamp tenant headers for downstream RSC/Route Handlers
  res.headers.set('x-tenant-id', tenant.id);
  res.headers.set('x-tenant-slug', tenant.slug);
  return res;
}

export const config = {
  // Exclude static assets, Vercel internals, auth API
  matcher: ['/((?!_next|_vercel|api/auth|.*\\..*).*)'],
};
```

Source: [CITED: ARCHITECTURE.md Section 1, STACK.md Multi-Tenant Routing Pattern]

### Pattern 3: Auth.js v5 Multi-Tenant Silo

**What:** Auth.js configured to scope every lookup and session to the current tenant.
**When to use:** The single Auth.js config that handles OTP (Email provider) + OAuth (Google/Apple).

```typescript
// server/auth/config.ts
import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import Email from 'next-auth/providers/email';
import { db } from '@/server/db/client';
import { headers } from 'next/headers';

export const { handlers, signIn, signOut, auth } = NextAuth((req) => {
  // Derive tenant from middleware-injected header — never trust client input
  const tenantId = req?.headers.get('x-tenant-id') ?? '';

  return {
    adapter: DrizzleAdapter(db),
    providers: [
      Email({
        // Custom OTP: generate 6-digit code, store in verification_tokens scoped to tenant
        generateVerificationToken: () =>
          Math.floor(100000 + Math.random() * 900000).toString(),
        sendVerificationRequest: async ({ identifier, token, url }) => {
          // Send OTP email — implement with Resend or similar
          // Token is the 6-digit code
        },
      }),
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      Apple({
        clientId: process.env.APPLE_CLIENT_ID!,
        clientSecret: process.env.APPLE_CLIENT_SECRET!,
      }),
    ],
    callbacks: {
      async signIn({ user, account }) {
        // Scope the sign-in to the current tenant
        // The DrizzleAdapter must be configured to filter by tenant_id
        return true;
      },
      async session({ session, token }) {
        // Inject tenantId into session so every API call is self-verifying
        session.tenantId = tenantId;
        return session;
      },
      async jwt({ token }) {
        token.tenantId = tenantId;
        return token;
      },
    },
    cookies: {
      sessionToken: {
        options: {
          // Lock cookie to the exact tenant domain — never a wildcard parent
          domain: req?.headers.get('host')?.replace(/:\d+$/, '') ?? undefined,
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        },
      },
    },
  };
});
```

Source: [CITED: ARCHITECTURE.md Section 3, PITFALLS.md Pitfall 2 + Pitfall 3]

### Pattern 4: CSS Custom Property Theming

**What:** Root layout reads tenant config and injects CSS custom properties for the vertical's color palette and both dark/light mode token sets.
**When to use:** Root layout — once per request.

```typescript
// app/layout.tsx
import { headers } from 'next/headers';
import { getTenant } from '@/server/tenant/resolve';

export default async function RootLayout({ children }) {
  const tenantId = headers().get('x-tenant-id');
  const tenant = await getTenant(tenantId);

  const css = `
    :root {
      --color-primary: ${tenant.theme.light.primary};
      --color-accent: ${tenant.theme.light.accent};
      --color-bg: ${tenant.theme.light.bg};
      --color-fg: ${tenant.theme.light.fg};
    }
    [data-theme="dark"] {
      --color-primary: ${tenant.theme.dark.primary};
      --color-accent: ${tenant.theme.dark.accent};
      --color-bg: ${tenant.theme.dark.bg};
      --color-fg: ${tenant.theme.dark.fg};
    }
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        {/* ThemeScript inlines a tiny script to set data-theme before paint */}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

Source: [CITED: ARCHITECTURE.md Section 4, CONTEXT.md D-20, D-31]

### Pattern 5: Tenant Accessor (RSC-safe)

**What:** A helper that reads the tenant from middleware-injected headers — usable in any Server Component or Server Action.
**When to use:** Everywhere a tenantId is needed in server code.

```typescript
// lib/tenant-context.ts
import { headers } from 'next/headers';
import { cache } from 'react';

// cache() deduplicates calls within a single render pass
export const getTenantId = cache(() => {
  const tenantId = headers().get('x-tenant-id');
  if (!tenantId) throw new Error('No tenant context — middleware may not have run');
  return tenantId;
});
```

Source: [CITED: ARCHITECTURE.md Component Responsibilities, STACK.md Multi-Tenant Routing Pattern]

### Anti-Patterns to Avoid

- **Direct db.select() without withTenant:** Any query on a tenant-scoped table that doesn't go through `withTenant()` is a data leak risk. There are no exceptions.
- **Hardcoded strings in JSX:** Every user-visible string must go through `t('key')` from next-intl. Enforce from the first commit.
- **Reading tenant from client-supplied input:** Always derive tenantId from `headers().get('x-tenant-id')`. Never trust query params, body fields, or client headers for this.
- **Cookie domain wildcard:** Do not set `Domain=.commu.com` or any shared parent — set the exact tenant hostname.
- **Drizzle/Node imports in middleware.ts:** Edge runtime does not support them. Middleware reads Edge Config only.
- **UNIQUE(email) without tenant_id:** The users table constraint must be `UNIQUE(tenant_id, email)`. A plain `UNIQUE(email)` destroys the silo model.
- **localStorage-only locale:** Locale must be in the URL path. Cookie is acceptable as a secondary signal; localStorage alone is not.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom session store | Auth.js v5 + Drizzle adapter | CSRF protection, token rotation, expiry — subtle to get right |
| OTP token generation/verification | Custom crypto + timing-safe comparison | Auth.js Email provider with custom token generator | Timing attacks, token reuse prevention, expiry handling |
| i18n routing and locale detection | Custom middleware locale logic | next-intl middleware (createIntlMiddleware) | Handles Accept-Language parsing, URL rewriting, cookie fallback correctly |
| CSS variable injection for theming | Custom style-in-JS | CSS custom properties from root layout + Tailwind v4 @theme | RSC-compatible, no hydration mismatch, no runtime JS |
| Environment variable validation | Manual process.env checks | @t3-oss/env-nextjs | Build-time type safety, early failure, typed access |
| Multi-field OTP input | DIY input array | shadcn/ui InputOTP (uses input-otp library) | Auto-advance, paste handling, accessibility, mobile keyboard |

**Key insight:** The highest-value "don't hand-roll" in Phase 1 is the Auth.js v5 OTP flow. The email OTP pattern looks deceptively simple (generate code, email it, verify it) but has at least a dozen edge cases: timing attacks on token comparison, token reuse, rate limiting on the send endpoint, expiry, brute force on the 6-digit code, and the multi-tenant scoping of all of the above. Auth.js handles the framework; the implementation must correctly scope it to the tenant.

---

## Common Pitfalls

### Pitfall 1: Missing tenant_id Filter — Cross-Tenant Data Leak
**What goes wrong:** A query omits `WHERE tenant_id = ?`. One tenant's data is visible to another.
**Why it happens:** Quick helper functions written without threading tenantId through.
**How to avoid:** Every query goes through `withTenant(tenantId, ...)`. RLS as a safety net. Integration test: seed two tenants, run all read queries as tenant A, assert zero tenant B rows.
**Warning signs:** New query helpers without a tenantId parameter; test suite with only one tenant seeded.

### Pitfall 2: Auth Silo Broken by Weak Constraint
**What goes wrong:** `UNIQUE(email)` instead of `UNIQUE(tenant_id, email)` silently collapses silos at the schema level.
**Why it happens:** Auth flows are originally written for single-tenant apps.
**How to avoid:** Schema migration must include `UNIQUE(tenant_id, email)`. OTP/password-reset flows must scope token lookups to `(tenant_id, email, token)`.
**Warning signs:** `users` table has a `UNIQUE(email)` index.

### Pitfall 3: Session Cookie Bleeds Across Domains
**What goes wrong:** Cookie with `Domain=.vercel.app` is readable by all preview deployments. In production, a shared parent domain bleeds across tenants.
**Why it happens:** Auth.js defaults are single-tenant; cookie domain is not overridden.
**How to avoid:** Set `cookies.sessionToken.options.domain` to the exact request host in Auth.js config. Test: authenticate on tenant A, navigate to tenant B in same browser, assert no session.
**Warning signs:** Auth.js config does not set `cookies.sessionToken.options.domain`.

### Pitfall 4: Middleware Doing Too Much (Edge Runtime Constraints)
**What goes wrong:** Middleware imports Drizzle, Node crypto, or heavy modules. Edge runtime rejects them. Build compiles; runtime silently fails.
**Why it happens:** Middleware is a convenient chokepoint; developers add logic without tracking Edge runtime limits.
**How to avoid:** Middleware reads Edge Config only. No Drizzle, no Node built-ins, no heavy libraries. Keep `middleware.ts` under 5KB. Tighten `matcher` to exclude `_next`, `_vercel`, static files, and `api/auth`.
**Warning signs:** middleware.ts imports from `drizzle-orm` or Node built-ins; matcher is `['/(.*)', '/api/(.*)']`.

### Pitfall 5: next-intl + Tenant Middleware Composition Conflict
**What goes wrong:** Two middleware concerns (tenant routing and locale routing) conflict — one overwrites the other's rewrite, or the locale detection runs before the tenant is resolved.
**Why it happens:** Middleware can only export a single function; composing two independent middleware libraries requires care.
**How to avoid:** Resolve tenant first (from Edge Config), then call next-intl's `intlMiddleware(req)` which handles locale rewriting. Apply tenant headers to the response returned by intlMiddleware. Verify both `x-tenant-id` and `x-locale` appear in request headers in RSC.
**Warning signs:** RSC receives `x-tenant-id` but not the correct locale, or vice versa.

### Pitfall 6: Hardcoded Strings in JSX from Day One
**What goes wrong:** English strings hardcoded during fast scaffolding. Retrofitting i18n at sprint 5 costs a full sprint.
**Why it happens:** "I'll add i18n at the end" trap. Especially tempting in a new project.
**How to avoid:** Establish the `t('key')` rule from the first component. Create `messages/en/auth.json`, `messages/en/nav.json`, `messages/en/common.json` before writing any JSX. Spanish files must exist immediately (even if empty — empty ES file still enforces the discipline).
**Warning signs:** Any JSX file with user-visible string literals.

### Pitfall 7: Dark Mode Flash on Load (FOUC)
**What goes wrong:** The page briefly renders in light mode before the dark mode class/attribute is applied, causing a flash of unstyled content (specifically a flash of the wrong color mode).
**Why it happens:** The theme preference is in localStorage but React hydrates before the localStorage read runs.
**How to avoid:** Inline a tiny synchronous script in `<head>` that reads localStorage and sets `data-theme` on `<html>` before any CSS is applied. This script must be inlined (not deferred) and must run synchronously.

```html
<!-- Inlined in <head> — no async, no defer -->
<script>
  (function() {
    var theme = localStorage.getItem('theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

**Warning signs:** Brief color flash on page load when OS is in dark mode and localStorage hasn't been read yet.

### Pitfall 8: Auth.js v5 OTP Route Conflict with App Router
**What goes wrong:** Auth.js v5's route handler (`/api/auth/[...nextauth]`) conflicts with Next.js App Router's file-based routing conventions if not set up correctly.
**Why it happens:** Auth.js v5 changed the handler export format from v4.
**How to avoid:** Use the v5 route handler pattern:
```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/server/auth/config';
export const { GET, POST } = handlers;
```
Do not use the v4 `export default NextAuth(...)` pattern in App Router.
**Warning signs:** 404 on `/api/auth/session` or OAuth callbacks failing.

---

## Code Examples

### Drizzle Schema (Phase 1 tables)

```typescript
// server/db/schema.ts
import { pgTable, uuid, text, timestamp, boolean, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { citext } from 'drizzle-orm/pg-core'; // or use text with .toLowerCase()

// ── Tenants ──────────────────────────────────────────────
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),           // 'aquarium', 'anime'
  domain: text('domain').notNull().unique(),        // 'aquariumcommu.com'
  name: text('name').notNull(),
  defaultLocale: text('default_locale').notNull().default('en'),
  // Theme config (stored as JSONB in practice; text here for schema clarity)
  themeLight: text('theme_light').notNull().default('{}'),  // JSON: colors, logo, etc.
  themeDark: text('theme_dark').notNull().default('{}'),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  tagline: text('tagline'),
  heroImageUrl: text('hero_image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Users (one row per (tenant, email) — silos enforced by UNIQUE) ──
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),                  // stored lowercase
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  displayName: text('display_name').notNull().default(''),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  locale: text('locale').default('en'),            // D-14: persisted preference
  darkMode: boolean('dark_mode'),                  // D-30: null = follow OS
  // Hierarchy tier (Phase 3 activates the reputation loop; Phase 1 scaffolds)
  tier: text('tier').notNull().default('member'),  // 'member' | 'verified_creator' | 'moderator' | 'admin'
  points: integer('points').notNull().default(0),  // Phase 3 fills this in
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // THE critical constraint — enforces per-domain account silo
  uniqTenantEmail: uniqueIndex('users_tenant_id_email_unique').on(t.tenantId, t.email),
  tenantIdx: index('users_tenant_idx').on(t.tenantId),
}));

// ── Auth.js required tables (DrizzleAdapter) ──────────────
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
}, (t) => ({
  // Provider account scoped per-tenant (same Google account = different Koral accounts)
  uniqTenantProvider: uniqueIndex('accounts_tenant_provider_unique')
    .on(t.tenantId, t.provider, t.providerAccountId),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),  // email
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
}, (t) => ({
  // Token is unique per (tenant, identifier, token) — prevents cross-tenant reuse
  pk: uniqueIndex('verification_tokens_pk').on(t.tenantId, t.identifier, t.token),
}));

// ── Groups (4-tier hierarchy scaffold — D-25, D-32–D-36) ──
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  location: text('location'),                      // D-36: nullable — interest-based, not geographic
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  memberCount: integer('member_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('groups_tenant_idx').on(t.tenantId),
}));

// ── Group memberships (many-to-many users ↔ groups) ───────
export const groupMembers = pgTable('group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),  // 'member' | 'admin'
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqMember: uniqueIndex('group_members_unique').on(t.groupId, t.userId),
  tenantIdx: index('group_members_tenant_idx').on(t.tenantId),
}));
```

Source: [CITED: ARCHITECTURE.md Section 2–3, CONTEXT.md D-25, D-32–D-36]

### next-intl Routing Config

```typescript
// i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localePrefix: 'always',  // always prefix — required for SEO (D-15)
});
```

Source: [CITED: next-intl documentation, CONTEXT.md D-15, D-16]

### Environment Variables (@t3-oss/env-nextjs)

```typescript
// lib/env.ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url().optional(), // optional — Vercel sets it automatically
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    APPLE_CLIENT_ID: z.string().min(1),
    APPLE_CLIENT_SECRET: z.string().min(1),
    EDGE_CONFIG: z.string().url(),             // Vercel Edge Config connection string
    EMAIL_SERVER: z.string().optional(),       // SMTP for OTP emails (or use Resend)
    EMAIL_FROM: z.string().email().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
    APPLE_CLIENT_SECRET: process.env.APPLE_CLIENT_SECRET,
    EDGE_CONFIG: process.env.EDGE_CONFIG,
    EMAIL_SERVER: process.env.EMAIL_SERVER,
    EMAIL_FROM: process.env.EMAIL_FROM,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
```

Source: [ASSUMED] — pattern consistent with @t3-oss/env-nextjs docs and CLAUDE.md requirement.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth v4 + Pages Router | Auth.js v5 + App Router | 2024–2025 | v5 exports `handlers`, `auth`, `signIn`, `signOut` — v4 patterns don't apply |
| `next-i18next` | `next-intl` | 2023 | next-i18next is Pages Router era; next-intl has native App Router + RSC support |
| Tailwind v3 JIT | Tailwind v4 Oxide | 2024–2025 | v4 is dramatically faster; `@theme` directive replaces `tailwind.config.js` extend; postcss config changes |
| `getServerSideProps` | RSC + `async` page components | 2024 | Pages Router pattern; App Router uses async RSC directly |
| Prisma on Vercel serverless | Drizzle + Neon HTTP driver | 2023–2024 | Prisma engine binary adds cold-start cost; Drizzle is a thin TS layer |
| `UNIQUE(email)` on users table | `UNIQUE(tenant_id, email)` | From day one | Multi-tenant silo requires composite constraint |

**Deprecated/outdated for this project:**
- `getStaticProps` / `getServerSideProps` — Pages Router, not applicable
- `_app.tsx` / `_document.tsx` — Pages Router, not applicable
- NextAuth v4 `export default NextAuth(options)` pattern — v5 uses named exports
- Tailwind `tailwind.config.js` theme extend for CSS variables — v4 uses `@theme` in CSS

---

## Concrete Build Order

This is the dependency-safe order for Phase 1 implementation. Each step unblocks the next.

1. **Project scaffold** — `pnpm create next-app` with TypeScript, App Router, Tailwind, src directory
2. **Env validation** — `lib/env.ts` with `@t3-oss/env-nextjs`; all required vars defined before any code runs
3. **Drizzle + Neon setup** — `server/db/client.ts`; Neon serverless driver configured; `withTenant()` wrapper written
4. **Schema definition** — all Phase 1 tables in `server/db/schema.ts`; `drizzle-kit push` or generate migration
5. **Edge Config setup** — Vercel Edge Config created; aquariumcommu.com tenant seeded; connection string in env
6. **Middleware** — `middleware.ts` with tenant resolution from Edge Config + next-intl composition; tested locally with `vercel dev`
7. **Tenant accessor** — `lib/tenant-context.ts` `getTenantId()` helper; verify in a test RSC page
8. **Theming** — root `app/layout.tsx` reads tenant config from DB, injects CSS custom properties; dark/light CSS tokens for aquarium theme; inline theme-init script to prevent FOUC
9. **Auth.js config** — `server/auth/config.ts`; Drizzle adapter; OTP Email provider; Google OAuth; cookie domain set to request host
10. **Auth route handler** — `app/api/auth/[...nextauth]/route.ts` with `export const { GET, POST } = handlers`
11. **Sign-in UI** — `SignInForm.tsx` (email input → OTP code); `OtpInput.tsx` (6-digit segmented input with auto-advance); `OAuthButtons.tsx`
12. **next-intl setup** — `i18n/routing.ts`; `i18n/request.ts`; `messages/en/*.json` + `messages/es/*.json` stubs; `[locale]/layout.tsx` with `NextIntlClientProvider`
13. **Nav bar** — `LangToggle.tsx` (EN | ES); `ThemeToggle.tsx` (sun/moon); integrated into `Navbar.tsx`
14. **Session persistence + sign-out** — verify session survives refresh (database sessions); sign-out from nav on any page
15. **Tenant isolation test** — seed two tenants in test DB; verify all DB queries as tenant A return zero tenant B rows
16. **Edge Config sync** — `server/tenant/edge-config-sync.ts`; called when a tenant row is inserted; proves TENT-04 (add row → no code change needed)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Auth.js v5 is installed via `next-auth@beta` tag | Standard Stack | Package tag may have changed; run `npm view next-auth dist-tags` to confirm |
| A2 | Next.js version on npm is 16.2.3 (superseding 15.x in prior research) | Standard Stack | May require re-checking App Router feature parity; unlikely to break patterns |
| A3 | `@auth/drizzle-adapter` v1.11.2 is compatible with next-auth@beta | Standard Stack | Adapters track Auth.js major; verify they share the same Auth.js version |
| A4 | Vercel Edge Config `get()` API is available in Next.js middleware at current package version | Pattern 2 (Middleware) | If Edge Config SDK changed API, middleware fails silently; verify `@vercel/edge-config` changelog |
| A5 | next-intl v4 `createIntlMiddleware` composes with custom tenant middleware without URL rewrite conflicts | Pattern 2 (Middleware) | If next-intl internally rewrites URLs before tenant headers are set, order must be swapped; verify in next-intl v4 docs |
| A6 | OTP code expiry window of 10 minutes is appropriate | Auth.js OTP flow | If too long, security window; if too short, user experience degrades; left to Claude's discretion per CONTEXT.md |
| A7 | `citext` extension for case-insensitive email is available on Neon Postgres | Schema | Neon should support standard Postgres extensions; verify in Neon dashboard before using `citext` type |

---

## Open Questions (RESOLVED)

1. **Auth.js v5 beta stability** — RESOLVED
   - What we know: Auth.js v5 has been in beta since 2023; the npm `latest` tag is still v4 (4.24.14)
   - **Resolution (Apr 2026):** `next-auth@beta` installs v5.0.0-beta.29+ which is the correct install path. `next-auth@latest` still resolves to v4. Plans use `next-auth@beta` — this is correct. No stable v5 GA yet, but beta is the intended production path per Auth.js maintainers and is used in production by many projects.

2. **OTP email delivery service** — RESOLVED
   - What we know: Auth.js Email provider handles the OTP flow logic; the actual email send requires SMTP or a transactional email API
   - **Resolution:** Use **Resend** (`resend` npm package) — clean API, generous free tier (3000 emails/month), React Email support, and sub-5-line integration with Auth.js v5 `sendVerificationRequest`. Add `RESEND_API_KEY` to env. Plans use a custom `sendVerificationRequest` calling the Resend SDK.

3. **Apple OAuth credential type** — RESOLVED
   - What we know: Apple OAuth requires a different credential format than Google (team ID + key ID + private key, not client ID + secret)
   - **Resolution:** Phase 1 implements Google OAuth fully and stubs Apple. Apple is configured in Auth.js v5 with `Apple({ clientId, clientSecret })` where `clientSecret` is a JWT generated from team ID + key ID + private key. This is handled by the `@auth/apple` provider. Plan 04 stubs the Apple block with `APPLE_CLIENT_ID` and `APPLE_CLIENT_SECRET` env vars — Apple can be activated before beta launch by provisioning credentials.

4. **Tailwind v4 shadcn/ui compatibility** — RESOLVED
   - What we know: Tailwind v4 (released early 2025) changed the configuration API significantly; shadcn/ui was designed for Tailwind v3
   - **Resolution (Apr 2026):** `shadcn@latest` (2.5+) fully supports Tailwind v4. Running `pnpm dlx shadcn@latest init` generates a `components.json` with `tailwind.cssVariables: true` and emits a CSS-variable-based theme into `globals.css` using the Tailwind v4 `@theme inline` directive. No `tailwind.config.js` is generated (Tailwind v4 uses `@import "tailwindcss"` in CSS). This is the correct path — Plan 01 uses this approach.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All server code | ✓ | v24.11.1 | — |
| npm / pnpm | Package management | ✓ (npm available) | npm bundled with Node | Install pnpm via `npm i -g pnpm` |
| Next.js | Framework | — (not installed yet) | 16.2.3 on registry | — |
| Vercel CLI | Local dev, env pull | — (not checked) | — | Use `vercel dev` after install: `pnpm i -g vercel` |
| Vercel Edge Config | Tenant registry in middleware | — (account required) | 1.4.3 (SDK) | Dev: use a static JSON file in middleware; prod: Edge Config required |
| Neon Postgres | Database | — (account required) | — | Dev: local Postgres via Docker |
| Google OAuth credentials | AUTH-02 | — (console.cloud.google.com) | — | Can scaffold auth without OAuth; add credentials when keys are provisioned |

**Missing dependencies with no fallback:**
- Neon Postgres account (or local Postgres for dev) — blocks all DB work
- Vercel project with Edge Config — blocks middleware tenant resolution

**Missing dependencies with fallback (dev only):**
- Vercel Edge Config: replace with a static JSON file in middleware for local development
- Google/Apple OAuth: scaffold Email OTP first; OAuth can be added when credentials are provisioned

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + React Testing Library |
| E2E | Playwright 1.59.1 |
| Config file | `vitest.config.ts` (Wave 0 gap) |
| Quick run command | `pnpm vitest run --reporter=dot` |
| Full suite command | `pnpm vitest run && pnpm playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | OTP code is sent on email entry; valid code creates session | Integration | `pnpm vitest run tests/auth/otp.test.ts` | Wave 0 gap |
| AUTH-01 | Invalid OTP code is rejected; expired token is rejected | Unit | `pnpm vitest run tests/auth/otp-validation.test.ts` | Wave 0 gap |
| AUTH-02 | Google OAuth callback creates user scoped to current tenant | Integration | `pnpm vitest run tests/auth/oauth.test.ts` | Wave 0 gap |
| AUTH-03 | Session cookie survives page reload; session is in DB | Integration | `pnpm playwright test tests/e2e/session-persistence.spec.ts` | Wave 0 gap |
| AUTH-04 | Sign-out clears session from DB and cookie | E2E | `pnpm playwright test tests/e2e/signout.spec.ts` | Wave 0 gap |
| AUTH-05 | Same email on two tenants creates two independent DB rows | Integration | `pnpm vitest run tests/auth/tenant-silo.test.ts` | Wave 0 gap |
| AUTH-05 | Session on tenant A is NOT valid on tenant B | E2E | `pnpm playwright test tests/e2e/cross-tenant-session.spec.ts` | Wave 0 gap |
| TENT-01 | Middleware stamps correct x-tenant-id for aquariumcommu.com | Unit | `pnpm vitest run tests/middleware/tenant-resolution.test.ts` | Wave 0 gap |
| TENT-01 | Root layout injects tenant-specific CSS custom properties | Unit | `pnpm vitest run tests/layout/theming.test.ts` | Wave 0 gap |
| TENT-02 | users table has UNIQUE(tenant_id, email) constraint (verified in DB) | Integration | `pnpm vitest run tests/db/schema-constraints.test.ts` | Wave 0 gap |
| TENT-03 | All nav/auth strings render from next-intl; no hardcoded English literals in JSX | Unit/lint | `pnpm vitest run tests/i18n/no-hardcoded-strings.test.ts` | Wave 0 gap |
| TENT-03 | Locale toggle switches between /en/ and /es/ routes | E2E | `pnpm playwright test tests/e2e/locale-switch.spec.ts` | Wave 0 gap |
| TENT-04 | Adding a new row to tenants + Edge Config exposes the vertical without code redeploy | Manual | — | Manual only |
| HIER-01 | DB schema includes tenants, users, groups, group_members tables with correct columns | Integration | `pnpm vitest run tests/db/schema-integrity.test.ts` | Wave 0 gap |

### Sampling Rate
- **Per task commit:** `pnpm vitest run --reporter=dot` (unit + integration, < 30 seconds)
- **Per wave merge:** `pnpm vitest run && pnpm playwright test` (full suite)
- **Phase gate:** Full suite green before marking Phase 1 complete

### Wave 0 Gaps
- [ ] `vitest.config.ts` — configure jsdom environment for React Testing Library
- [ ] `playwright.config.ts` — configure base URL, multi-domain testing for cross-tenant E2E
- [ ] `tests/helpers/db.ts` — shared test DB setup/teardown + two-tenant seed fixture
- [ ] `tests/auth/otp.test.ts` — AUTH-01 OTP flow integration test
- [ ] `tests/auth/tenant-silo.test.ts` — AUTH-05 two-tenant isolation test (most critical)
- [ ] `tests/middleware/tenant-resolution.test.ts` — TENT-01 middleware unit test
- [ ] `tests/db/schema-constraints.test.ts` — TENT-02/HIER-01 constraint verification
- [ ] `tests/e2e/cross-tenant-session.spec.ts` — AUTH-05 E2E session isolation

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth.js v5 with OTP (6-digit, expiry 10 min) + OAuth |
| V3 Session Management | yes | Auth.js database sessions; cookie domain locked to tenant host; tenant_id in session |
| V4 Access Control | yes | tenantDb() wrapper enforces tenant isolation; RLS as safety net |
| V5 Input Validation | yes | Zod on all Server Action inputs; email validated before OTP send |
| V6 Cryptography | yes | Auth.js handles token hashing; NEXTAUTH_SECRET must be ≥32 random bytes |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data leak via missing tenant_id filter | Information Disclosure | tenantDb() wrapper + RLS + integration test with two tenants |
| Session cookie shared across tenants via wildcard domain | Elevation of Privilege | Explicit `cookies.sessionToken.options.domain` set to exact host in Auth.js config |
| OTP brute force (10^6 possibilities for 6-digit code) | Spoofing | Rate limit on `/api/auth/callback/email`; token expiry; Upstash rate limiter |
| Account takeover via cross-tenant OTP reuse | Spoofing | OTP token scoped to `(tenant_id, email, token)` — token is invalid on other tenant |
| x-tenant-id header spoofing from external requests | Tampering | Vercel strips external custom headers; header only trusted in RSC (not in client code) |
| CSRF on Server Actions | Tampering | Next.js App Router Server Actions include built-in CSRF origin check — do not disable |

---

## Sources

### Primary (HIGH confidence)
- CLAUDE.md (project instructions) — stack decisions, conventions, multi-tenant patterns
- `.planning/research/ARCHITECTURE.md` — tenant resolution, data model, account silo patterns, theming, i18n routing
- `.planning/research/STACK.md` — prescriptive stack with rationale
- `.planning/research/PITFALLS.md` — 13 pitfalls with prevention strategies
- `.planning/phases/01-foundation/1-CONTEXT.md` — locked decisions D-01 through D-36

### Secondary (MEDIUM confidence — version-verified but docs not re-fetched)
- npm registry (verified 2026-04-14): next@16.2.3, next-auth@4.24.14 (v5 = beta tag), drizzle-orm@0.45.2, next-intl@4.9.1, tailwindcss@4.2.2, react@19.2.5, @neondatabase/serverless@1.0.2, @vercel/edge-config@1.4.3, zod@4.3.6, vitest@4.1.4, @playwright/test@1.59.1

### Tertiary (LOW confidence — [ASSUMED])
- OTP expiry window (10 minutes): standard practice for email codes; not verified against Auth.js docs in this session
- Apple OAuth credential format: known to differ from Google; specific Auth.js v5 config not re-verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm registry; library choices locked in CLAUDE.md
- Architecture patterns: HIGH — drawn from project's own ARCHITECTURE.md research artifact (prior session)
- Auth.js v5 multi-tenant pattern: MEDIUM — v5 was in beta at prior research cutoff; version tag should be confirmed before implementation
- next-intl + tenant middleware composition: MEDIUM — pattern is sound but next-intl v4 specific API should be verified in official docs
- Pitfalls: HIGH — drawn from PITFALLS.md which has HIGH confidence rating

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable stack; re-verify Auth.js v5 release status before implementation)
