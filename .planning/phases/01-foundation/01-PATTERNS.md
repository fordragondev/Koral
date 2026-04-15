# Phase 1: Foundation - Pattern Map

**Mapped:** 2026-04-14
**Files analyzed:** 22 new files
**Analogs found:** 0 / 22 (greenfield — no source files exist yet)
**Note:** This is a greenfield project. All files below are first implementations. Patterns are sourced from RESEARCH.md architecture guidance, CLAUDE.md stack conventions, and locked decisions in CONTEXT.md.

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/middleware.ts` | middleware | request-response | — | greenfield first |
| `src/lib/env.ts` | config | — | — | greenfield first |
| `src/lib/tenant-context.ts` | utility | request-response | — | greenfield first |
| `src/server/db/client.ts` | config | CRUD | — | greenfield first |
| `src/server/db/schema.ts` | model | CRUD | — | greenfield first |
| `src/server/db/migrations/` | migration | — | — | greenfield first |
| `src/server/auth/config.ts` | config | request-response | — | greenfield first |
| `src/server/tenant/resolve.ts` | utility | request-response | — | greenfield first |
| `src/server/tenant/edge-config-sync.ts` | service | CRUD | — | greenfield first |
| `src/i18n/routing.ts` | config | — | — | greenfield first |
| `src/i18n/request.ts` | config | request-response | — | greenfield first |
| `src/app/layout.tsx` | component | request-response | — | greenfield first |
| `src/app/[locale]/layout.tsx` | component | request-response | — | greenfield first |
| `src/app/[locale]/page.tsx` | component | request-response | — | greenfield first |
| `src/app/[locale]/(auth)/sign-in/page.tsx` | component | request-response | — | greenfield first |
| `src/app/[locale]/(auth)/verify/page.tsx` | component | request-response | — | greenfield first |
| `src/app/api/auth/[...nextauth]/route.ts` | route | request-response | — | greenfield first |
| `src/components/auth/OtpInput.tsx` | component | event-driven | — | greenfield first |
| `src/components/auth/SignInForm.tsx` | component | request-response | — | greenfield first |
| `src/components/auth/OAuthButtons.tsx` | component | request-response | — | greenfield first |
| `src/components/layout/Navbar.tsx` | component | event-driven | — | greenfield first |
| `src/components/layout/LangToggle.tsx` | component | event-driven | — | greenfield first |
| `src/components/layout/ThemeToggle.tsx` | component | event-driven | — | greenfield first |
| `src/styles/globals.css` | config | — | — | greenfield first |
| `src/messages/en/common.json` | config | — | — | greenfield first |
| `src/messages/en/nav.json` | config | — | — | greenfield first |
| `src/messages/en/auth.json` | config | — | — | greenfield first |
| `src/messages/es/common.json` | config | — | — | greenfield first |
| `src/messages/es/nav.json` | config | — | — | greenfield first |
| `src/messages/es/auth.json` | config | — | — | greenfield first |

---

## Pattern Assignments

### `src/middleware.ts` (middleware, request-response)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md Pattern 2, CONTEXT.md D-22, D-16, Pitfall 4, Pitfall 5

**Required pattern — full implementation:**
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(req: NextRequest) {
  // Step 1: resolve tenant from Edge Config ONLY — no DB, no Node APIs (Pitfall 4)
  const host = req.headers.get('host')?.replace(/:\d+$/, '').replace(/^www\./, '') ?? '';
  const tenantMap = await get<Record<string, { id: string; slug: string }>>('tenants');
  const tenant = tenantMap?.[host];
  if (!tenant) return new NextResponse('Unknown tenant', { status: 404 });

  // Step 2: delegate locale routing to next-intl (Pitfall 5 — tenant first, then locale)
  const res = intlMiddleware(req);

  // Step 3: stamp tenant headers so downstream RSC/Route Handlers can read them
  res.headers.set('x-tenant-id', tenant.id);
  res.headers.set('x-tenant-slug', tenant.slug);
  return res;
}

export const config = {
  // Exclude static assets, Vercel internals, auth API (Pitfall 4)
  matcher: ['/((?!_next|_vercel|api/auth|.*\\..*).*)'],
};
```

**Critical constraints:**
- NEVER import `drizzle-orm`, Node built-ins, or any non-Edge-compatible module here (Pitfall 4)
- Tenant resolution MUST happen before `intlMiddleware` call (Pitfall 5)
- Keep file under 5KB
- The `matcher` must exclude `_next`, `_vercel`, `api/auth`, and static files

---

### `src/lib/env.ts` (config)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md Code Examples (env validation), CLAUDE.md `@t3-oss/env-nextjs`

**Required pattern:**
```typescript
// lib/env.ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url().optional(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    APPLE_CLIENT_ID: z.string().min(1),
    APPLE_CLIENT_SECRET: z.string().min(1),
    EDGE_CONFIG: z.string().url(),
    EMAIL_SERVER: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: { /* map all keys to process.env */ },
});
```

**Critical constraints:**
- This file is imported by `server/db/client.ts` and `server/auth/config.ts` — it must load before any DB or auth code runs
- All env vars used anywhere in the codebase must be declared here; never call `process.env.X` directly outside this file

---

### `src/lib/tenant-context.ts` (utility, request-response)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md Pattern 5, CONTEXT.md D-22, D-23

**Required pattern:**
```typescript
// lib/tenant-context.ts
import { headers } from 'next/headers';
import { cache } from 'react';

// cache() deduplicates across a single render pass — safe to call from multiple RSCs
export const getTenantId = cache(() => {
  const tenantId = headers().get('x-tenant-id');
  if (!tenantId) throw new Error('No tenant context — middleware may not have run');
  return tenantId;
});
```

**Critical constraints:**
- RSC-only helper — do not import in Client Components
- NEVER read `tenantId` from query params, request body, or client-supplied headers
- Used by every Server Component, Server Action, and Route Handler that touches the DB

---

### `src/server/db/client.ts` (config, CRUD)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md Pattern 1, CONTEXT.md D-23, Pitfall 1

**Required pattern:**
```typescript
// server/db/client.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { env } from '@/lib/env';

const queryClient = neon(env.DATABASE_URL);
export const db = drizzle(queryClient, { schema });

// THE ONLY approved path to run queries on tenant-scoped tables
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

**Critical constraints:**
- `withTenant()` is the ONLY approved way to query tenant-scoped tables (Pitfall 1)
- Raw `db.select()` calls on tenant tables without `withTenant()` are a hard lint violation
- Neon HTTP driver (`drizzle-orm/neon-http`) — not the ws driver — is required for Vercel serverless
- `env` import (not `process.env`) enforces env validation at startup

---

### `src/server/db/schema.ts` (model, CRUD)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md Code Examples (Drizzle Schema), CONTEXT.md D-11, D-25, D-32–D-36, Pitfall 2

**Phase 1 tables to define:**
1. `tenants` — source of truth for vertical registry; `slug`, `domain`, `themeLight` (JSONB), `themeDark` (JSONB), `logoUrl`, `faviconUrl`, `tagline`, `heroImageUrl`, `defaultLocale`, `isActive`
2. `users` — **UNIQUE(tenant_id, email)** composite constraint is non-negotiable (Pitfall 2); includes `tier`, `points` (nullable/zero-defaulted), `locale`, `darkMode` per D-14 and D-30
3. `accounts` — Auth.js DrizzleAdapter required table; add `tenantId` + **UNIQUE(tenant_id, provider, provider_account_id)**
4. `sessions` — Auth.js DrizzleAdapter required table; add `tenantId` column
5. `verificationTokens` — Auth.js DrizzleAdapter required table; **UNIQUE(tenant_id, identifier, token)** — prevents cross-tenant OTP reuse
6. `groups` — interest-based (D-32–D-34); `location` is nullable (D-36 overrides GRP-01); add `tenantId` with index
7. `groupMembers` — junction table; **UNIQUE(group_id, user_id)**; add `tenantId` for RLS coverage

**Column naming:** camelCase in schema definition, snake_case in DB (Drizzle handles the mapping via second argument to column helpers).

**Index strategy:** Every tenant-scoped table gets an index on `tenant_id`. Every join table gets a composite unique index.

**Critical constraints:**
- `users` table: constraint is `UNIQUE(tenant_id, email)` — never `UNIQUE(email)` alone (Pitfall 2)
- `verificationTokens`: scoped to `(tenant_id, identifier, token)` — prevents OTP reuse across tenants
- `groups.location` must be nullable (D-36)
- Reputation columns (`points`, `tier`) scaffold here with defaults; Phase 3 activates the loop

---

### `src/server/auth/config.ts` (config, request-response)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md Pattern 3, Pitfall 2, Pitfall 3, Pitfall 8, CONTEXT.md D-04–D-11

**Required pattern:**
```typescript
// server/auth/config.ts — Auth.js v5 functional config (req-scoped)
import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import Email from 'next-auth/providers/email';
import { db } from '@/server/db/client';

export const { handlers, signIn, signOut, auth } = NextAuth((req) => {
  // ALWAYS derive tenantId from middleware header — never client input (D-22)
  const tenantId = req?.headers.get('x-tenant-id') ?? '';

  return {
    adapter: DrizzleAdapter(db),
    providers: [
      Email({
        generateVerificationToken: () =>
          Math.floor(100000 + Math.random() * 900000).toString(), // 6-digit OTP (D-08)
        sendVerificationRequest: async ({ identifier, token }) => {
          // Call email service (Resend or SMTP) here
        },
      }),
      Google({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }),
      Apple({ clientId: env.APPLE_CLIENT_ID, clientSecret: env.APPLE_CLIENT_SECRET }),
    ],
    callbacks: {
      async session({ session }) {
        session.tenantId = tenantId; // inject into every session (D-11)
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
          // Lock cookie to exact tenant domain — NEVER a wildcard parent (Pitfall 3)
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

**Critical constraints:**
- `tenantId` derived from `req.headers.get('x-tenant-id')` — never from query string or body
- Cookie domain set to exact request host, not a parent wildcard (Pitfall 3)
- Auth.js v5 functional config form `NextAuth((req) => { ... })` — not static object form
- OTP token is 6-digit numeric string per D-08

---

### `src/app/api/auth/[...nextauth]/route.ts` (route, request-response)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md Pitfall 8

**Required pattern:**
```typescript
// app/api/auth/[...nextauth]/route.ts — Auth.js v5 App Router handler (Pitfall 8)
import { handlers } from '@/server/auth/config';
export const { GET, POST } = handlers;
```

**Critical constraints:**
- This is the ONLY correct pattern for Auth.js v5 with App Router
- Do NOT use v4 `export default NextAuth(options)` pattern
- Do NOT add any custom logic here — all customization belongs in `server/auth/config.ts`

---

### `src/server/tenant/resolve.ts` (utility, request-response)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md Pattern 4, Pattern 5, CONTEXT.md D-18, D-19, D-20

**Responsibility:** Read `x-tenant-id` header, query the `tenants` table via `withTenant()`, return the full tenant config row (theme tokens, logo, tagline, etc.) for use in the root layout.

**Required pattern:**
```typescript
// server/tenant/resolve.ts
import { cache } from 'react';
import { db, withTenant } from '@/server/db/client';
import { tenants } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant-context';

export const getTenant = cache(async () => {
  const tenantId = getTenantId();
  const [tenant] = await withTenant(tenantId, (tx) =>
    tx.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  );
  if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);
  return tenant;
});
```

**Critical constraints:**
- Wrapped in `cache()` so root layout and any RSC calling it within the same render get one DB hit
- Uses `withTenant()` even for the tenants table itself for RLS coverage
- Return type must include parsed `themeLight` and `themeDark` JSON for root layout CSS injection

---

### `src/server/tenant/edge-config-sync.ts` (service, CRUD)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md build step 16, CONTEXT.md D-24, TENT-04

**Responsibility:** When a new tenant row is inserted to the DB, sync its `domain → { id, slug }` mapping to Vercel Edge Config so the middleware can resolve it without a code deployment.

**Required pattern:**
```typescript
// server/tenant/edge-config-sync.ts
// Called as a Server Action or Inngest job after tenant insert
import { createClient } from '@vercel/edge-config-write'; // or Vercel REST API

export async function syncTenantToEdgeConfig(tenant: {
  id: string;
  slug: string;
  domain: string;
}) {
  // Patch the 'tenants' key in Edge Config
  // { [domain]: { id, slug } }
}
```

**Critical constraints:**
- Vercel Edge Config write API requires a different SDK from the read API (`@vercel/edge-config` is read-only)
- Must be called in a Server Action or background job (Inngest) — never in middleware
- Failure here does not break existing tenants; log and alert but don't throw to user

---

### `src/i18n/routing.ts` (config)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md Code Examples (next-intl routing), CONTEXT.md D-15, D-16

**Required pattern:**
```typescript
// i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localePrefix: 'always', // required for SEO hreflang (D-15)
});
```

---

### `src/i18n/request.ts` (config, request-response)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md Standard Stack (next-intl v4)

**Responsibility:** next-intl server-side request config — loads the right message bundle for the current locale in RSC.

**Required pattern:**
```typescript
// i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}/common.json`)).default,
    // Merge additional namespaces per page as needed
  };
});
```

---

### `src/app/layout.tsx` (component, request-response)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md Pattern 4, Pitfall 7, CONTEXT.md D-20, D-28, D-31

**Responsibility:** Root layout. Reads tenant from DB, injects per-vertical CSS custom properties for both dark and light mode, renders the inline theme-init script to prevent FOUC (Pitfall 7).

**Required pattern:**
```typescript
// app/layout.tsx
import { headers } from 'next/headers';
import { getTenant } from '@/server/tenant/resolve';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();
  const themeLight = JSON.parse(tenant.themeLight);
  const themeDark = JSON.parse(tenant.themeDark);

  const css = `
    :root {
      --color-primary: ${themeLight.primary};
      --color-accent: ${themeLight.accent};
      --color-bg: ${themeLight.bg};
      --color-fg: ${themeLight.fg};
    }
    [data-theme="dark"] {
      --color-primary: ${themeDark.primary};
      --color-accent: ${themeDark.accent};
      --color-bg: ${themeDark.bg};
      --color-fg: ${themeDark.fg};
    }
  `;

  // Inline synchronous script — prevents dark mode flash (Pitfall 7)
  const themeInitScript = `(function(){var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);})();`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Critical constraints:**
- `suppressHydrationWarning` on `<html>` is required because `data-theme` is set by inline script before hydration
- The theme-init script must be synchronous — no `async`, no `defer` (Pitfall 7)
- CSS custom properties set here are the only source of truth for brand colors — no hardcoded hex values in components

---

### `src/app/[locale]/layout.tsx` (component, request-response)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md Architecture Patterns (project structure), next-intl v4 docs

**Responsibility:** Locale-aware app shell. Wraps children with `NextIntlClientProvider` so Client Components can use `useTranslations`. Sets the `lang` attribute on `<html>` to the current locale.

**Required pattern:**
```typescript
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) notFound();

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
```

---

### `src/app/[locale]/page.tsx` (component, request-response)

**Analog:** None (greenfield first)
**Source authority:** RESEARCH.md build step description, CONTEXT.md D-01–D-03

**Responsibility:** Home/feed placeholder page for Phase 1. Must be a Server Component (RSC), publicly accessible without auth (D-01), and server-rendered for SEO (D-03). Uses `useTranslations` (RSC form via `getTranslations`) — no hardcoded strings.

```typescript
// app/[locale]/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('common');
  return <main>{t('welcome')}</main>;
}
```

---

### `src/app/[locale]/(auth)/sign-in/page.tsx` (component, request-response)

**Analog:** None (greenfield first)
**Source authority:** CONTEXT.md D-04–D-09, RESEARCH.md Don't Hand-Roll (OTP)

**Responsibility:** Unified sign-in/sign-up page. No separate Register page (D-05). Email input leads to OTP code delivery — if account exists, sign in; if not, create account silently. OAuth buttons also present (D-09).

**Pattern notes:**
- RSC page shell that renders `<SignInForm />` and `<OAuthButtons />` Client Components
- `getTranslations('auth')` for all strings — no hardcoded English
- Does not call `signIn()` directly — delegates to `<SignInForm />`

---

### `src/app/[locale]/(auth)/verify/page.tsx` (component, request-response)

**Analog:** None (greenfield first)
**Source authority:** CONTEXT.md D-06–D-08

**Responsibility:** OTP code entry page. Renders `<OtpInput />`. Auto-submits on 6th digit entry (D-08). On success, redirects to home or the originally requested URL.

---

### `src/components/auth/OtpInput.tsx` (component, event-driven)

**Analog:** None (greenfield first)
**Source authority:** CONTEXT.md D-08, RESEARCH.md Don't Hand-Roll

**Responsibility:** 6-digit segmented OTP input. Must auto-advance between digit fields, handle paste of full code, auto-submit on last digit entry, support mobile numeric keyboard.

**Implementation note:** Use `shadcn/ui` InputOTP (built on the `input-otp` library) rather than hand-rolling (RESEARCH.md Don't Hand-Roll). The `shadcn/ui` component handles auto-advance, paste, and accessibility.

```typescript
'use client';
// Uses shadcn/ui InputOTP — do NOT hand-roll segmented input
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
```

**Critical constraints:**
- Must be a Client Component (`'use client'`) — event-driven DOM interaction
- All labels and error messages from `useTranslations('auth')`
- Auto-submit callback triggers Server Action or form submit on 6th digit

---

### `src/components/auth/SignInForm.tsx` (component, request-response)

**Analog:** None (greenfield first)
**Source authority:** CONTEXT.md D-04–D-05, RESEARCH.md Standard Stack (react-hook-form + zod)

**Responsibility:** Email input form. On submit calls Auth.js `signIn('email', { email, redirect: false })`. Handles the "email sent" state transition. Uses `react-hook-form` + `zod` for validation.

```typescript
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
```

**Critical constraints:**
- Client Component
- Form validation via Zod schema, not manual checks
- All user-visible strings from `useTranslations('auth')`

---

### `src/components/auth/OAuthButtons.tsx` (component, request-response)

**Analog:** None (greenfield first)
**Source authority:** CONTEXT.md D-09, RESEARCH.md Pattern 3

**Responsibility:** Google and Apple sign-in buttons. Calls `signIn('google')` / `signIn('apple')` on click.

```typescript
'use client';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
```

---

### `src/components/layout/Navbar.tsx` (component, event-driven)

**Analog:** None (greenfield first)
**Source authority:** CONTEXT.md D-13, D-29

**Responsibility:** Top navigation bar. Contains `<LangToggle />` and `<ThemeToggle />`. Visible at all times regardless of auth state (D-13). Renders sign-in link when logged out, user avatar/menu when logged in.

**Pattern notes:**
- Server Component shell that renders auth state from `auth()` (Auth.js v5)
- Passes auth state down to Client Component children as props
- All strings from `useTranslations('nav')`

---

### `src/components/layout/LangToggle.tsx` (component, event-driven)

**Analog:** None (greenfield first)
**Source authority:** CONTEXT.md D-12–D-16, RESEARCH.md Architecture (language toggle)

**Responsibility:** `EN | ES` text toggle. On click, navigates to the same page with the alternate locale prefix. On sign-in, locale preference syncs to account (D-14).

```typescript
'use client';
import { useRouter, usePathname } from 'next/navigation'; // next-intl aware routing
import { useLocale } from 'next-intl';
```

**Critical constraints:**
- Must produce a URL change — locale cannot be cookie-only (D-15)
- Uses next-intl's `useRouter` (not plain Next.js `useRouter`) to handle locale-prefixed path construction
- No flag icons — plain `EN | ES` text per CONTEXT.md specifics

---

### `src/components/layout/ThemeToggle.tsx` (component, event-driven)

**Analog:** None (greenfield first)
**Source authority:** CONTEXT.md D-28–D-31, Pitfall 7

**Responsibility:** Sun/moon icon toggle. On click, flips `data-theme` attribute on `<html>`, writes to `localStorage`, and (when signed in) calls a Server Action to persist to `users.darkMode`.

```typescript
'use client';
// Reads initial value from document.documentElement.getAttribute('data-theme')
// Writes to localStorage and dispatches data-theme attribute change
```

**Critical constraints:**
- `localStorage` write is immediate (works for logged-out visitors, D-30)
- When user is signed in, calls a Server Action to sync to `users.darkMode`
- Initial value comes from the inline theme-init script already applied by `app/layout.tsx` — do not re-read OS preference here

---

### `src/styles/globals.css` (config)

**Analog:** None (greenfield first)
**Source authority:** CLAUDE.md (Tailwind v4), RESEARCH.md Pattern 4

**Responsibility:** Tailwind v4 base import + `@theme` directive for any tokens that Tailwind utility classes consume from CSS custom properties. Does NOT hardcode brand colors — those come from tenant config at runtime via root layout `<style>` injection.

```css
@import "tailwindcss";

@theme {
  /* Map CSS custom properties to Tailwind tokens */
  --color-primary: var(--color-primary);
  --color-accent: var(--color-accent);
  --color-bg: var(--color-bg);
  --color-fg: var(--color-fg);
}
```

---

### `src/messages/{en,es}/*.json` (config)

**Analog:** None (greenfield first)
**Source authority:** CONTEXT.md D-17, RESEARCH.md Pitfall 6

**Files to create immediately (Pitfall 6):**
- `src/messages/en/common.json` — shared strings (loading, error, etc.)
- `src/messages/en/nav.json` — nav bar strings (sign in, sign out, EN/ES toggle labels)
- `src/messages/en/auth.json` — auth flow strings (email prompt, OTP instructions, button labels)
- `src/messages/es/common.json` — Spanish equivalents (stubs are acceptable in dev but must exist)
- `src/messages/es/nav.json`
- `src/messages/es/auth.json`

**Critical constraints:**
- ES files must exist from the first commit, even if values are empty stubs — this enforces the discipline (Pitfall 6)
- Keys must be identical between `en/` and `es/` namespaces
- No user-visible string may be hardcoded in JSX

---

## Shared Patterns

### Pattern A: Tenant Guard — Every Server Entry Point
**Apply to:** `app/layout.tsx`, all Server Components reading DB data, all Server Actions
**Rule:** Always call `getTenantId()` from `lib/tenant-context.ts` before any DB access. Never derive tenant from client-supplied values.

```typescript
import { getTenantId } from '@/lib/tenant-context';
import { withTenant } from '@/server/db/client';

// Pattern for any server function touching a tenant-scoped table:
const tenantId = getTenantId();
const result = await withTenant(tenantId, (tx) => tx.select()...);
```

### Pattern B: DB Access — Always Through `withTenant()`
**Apply to:** All Drizzle queries on tenant-scoped tables (users, groups, group_members, sessions, accounts, verificationTokens)
**Rule:** Raw `db.select()` / `db.insert()` without `withTenant()` is forbidden on tenant-scoped tables. The `tenants` table itself is also queried through `withTenant()` for RLS coverage.
**Source:** RESEARCH.md Pattern 1, Pitfall 1

### Pattern C: i18n — No Hardcoded User-Visible Strings
**Apply to:** Every JSX file
**Rule:** All user-visible strings go through `t('key')` (Server Components: `await getTranslations('namespace')`, Client Components: `useTranslations('namespace')`). No English string literals in JSX.
**Source:** RESEARCH.md Pitfall 6

```typescript
// Server Component:
const t = await getTranslations('auth');
return <button>{t('signIn')}</button>;

// Client Component:
const t = useTranslations('nav');
return <span>{t('langToggle')}</span>;
```

### Pattern D: Auth.js Session Verification — Server Actions
**Apply to:** Any Server Action that requires authentication (create content, join group, etc.)
**Rule:** Call `auth()` from Auth.js v5, check `session.tenantId === getTenantId()`. Reject if mismatch.
**Source:** RESEARCH.md Pattern 3, CONTEXT.md D-11

```typescript
import { auth } from '@/server/auth/config';
import { getTenantId } from '@/lib/tenant-context';

// Inside any protected Server Action:
const [session, tenantId] = await Promise.all([auth(), getTenantId()]);
if (!session || session.tenantId !== tenantId) {
  throw new Error('Unauthorized');
}
```

### Pattern E: Client Component Boundary
**Apply to:** All components
**Rule:** Components that handle DOM events, use `useState`, `useEffect`, `localStorage`, or auth client-side hooks must be Client Components (`'use client'`). All other components default to Server Components. Do not add `'use client'` to server utilities, DB helpers, or auth config.

### Pattern F: Environment Variables — Access Only Through `env`
**Apply to:** All files
**Rule:** Never call `process.env.X` directly in application code. Always import from `@/lib/env` so the Zod schema validates at startup.
**Source:** RESEARCH.md Code Examples (env validation)

---

## No Analog Found

All files in Phase 1 are greenfield first implementations. There are no existing source files in the repository to use as analogs. The planner must use RESEARCH.md patterns and the excerpts above as the sole pattern reference.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| All 30 files listed above | various | various | Greenfield project — zero existing source files |

---

## Build Order Dependency Map

The following ordering is load-bearing. Plans should respect these dependencies.

```
1. lib/env.ts                          (no dependencies)
2. server/db/client.ts                 (needs: env.ts)
3. server/db/schema.ts                 (needs: client.ts)
4. server/db/migrations/               (needs: schema.ts, drizzle-kit)
5. lib/tenant-context.ts               (no app dependencies)
6. middleware.ts                        (needs: i18n/routing.ts, @vercel/edge-config)
7. i18n/routing.ts                     (no dependencies)
8. i18n/request.ts                     (needs: i18n/routing.ts, messages/)
9. messages/**/*.json                  (no dependencies — create first)
10. server/tenant/resolve.ts           (needs: client.ts, schema.ts, tenant-context.ts)
11. app/layout.tsx                     (needs: tenant/resolve.ts)
12. server/auth/config.ts              (needs: client.ts, schema.ts, env.ts)
13. app/api/auth/[...nextauth]/route.ts (needs: auth/config.ts)
14. app/[locale]/layout.tsx            (needs: i18n/routing.ts, i18n/request.ts)
15. components/auth/OtpInput.tsx       (needs: shadcn/ui InputOTP)
16. components/auth/SignInForm.tsx     (needs: OtpInput.tsx, next-auth/react)
17. components/auth/OAuthButtons.tsx   (needs: next-auth/react)
18. app/[locale]/(auth)/sign-in/page.tsx (needs: SignInForm, OAuthButtons)
19. app/[locale]/(auth)/verify/page.tsx  (needs: OtpInput)
20. components/layout/ThemeToggle.tsx  (no server dependencies)
21. components/layout/LangToggle.tsx   (needs: next-intl routing)
22. components/layout/Navbar.tsx       (needs: LangToggle, ThemeToggle, auth())
23. app/[locale]/page.tsx              (needs: locale layout, getTranslations)
24. server/tenant/edge-config-sync.ts  (needs: schema.ts, Vercel Edge Config write API)
```

---

## Metadata

**Analog search scope:** Entire repository (`src/`)
**Files scanned:** 0 (repository has no source files — greenfield)
**Pattern sources:** RESEARCH.md (all sections), CONTEXT.md decisions D-01–D-36, CLAUDE.md stack conventions
**Pattern extraction date:** 2026-04-14
