---
phase: 01-foundation
plan: 04
subsystem: auth
tags: [authjs, nextauth, oauth, otp, drizzle-adapter, multi-tenant]

requires:
  - phase: 01-foundation/02
    provides: Drizzle schema (users/accounts/sessions/verificationTokens), db client, withTenant()
  - phase: 01-foundation/03
    provides: Edge middleware stamps x-tenant-id header on every request

provides:
  - Auth.js v5 functional config scoped per-request to tenantId from x-tenant-id header
  - OTP email provider (6-digit numeric code, 10-min window)
  - Google + Apple OAuth providers (Apple conditionally enabled)
  - DrizzleAdapter wiring Auth.js to the Phase 1 Postgres schema
  - Cookie domain locked to exact request host (Pitfall 3)
  - signOutAction() Server Action (AUTH-04)
  - App Router catch-all route handler

affects: [01-05, 01-06]

tech-stack:
  added: [next-auth@5, @auth/drizzle-adapter]
  patterns: [functional NextAuth config form, tenant-scoped cookies, per-request tenantId injection]

key-files:
  created:
    - src/server/auth/config.ts
    - src/server/auth/email-sender.ts
    - src/server/auth/actions.ts
    - src/app/api/auth/[...nextauth]/route.ts
    - tests/unit/auth.test.ts

key-decisions:
  - "Functional config form NextAuth((req) => {...}) — NOT static object (Pitfall 8)"
  - "tenantId derived ONLY from req.headers.get('x-tenant-id') — never from client input (D-22)"
  - "Cookie name includes tenantId — prevents cross-tenant cookie collision"
  - "Cookie domain = exact request host, never wildcard parent (Pitfall 3)"
  - "strategy: 'database' — persistent sessions (AUTH-03)"

patterns-established:
  - "auth() call in RSC: import from @/server/auth/config"
  - "signOut via signOutAction() Server Action — never direct client call"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

duration: ~35min
completed: 2026-04-16
---

# Phase 01-04: Auth.js v5 Multi-Tenant Auth Config Summary

**Auth.js v5 functional config with 6-digit OTP, Google+Apple OAuth, DrizzleAdapter, per-tenant cookie isolation, and signOutAction Server Action**

## Accomplishments
- `src/server/auth/config.ts`: functional NextAuth((req) => {...}) form reads `x-tenant-id` from middleware header per request — tenantId never comes from client input (T-04-01)
- Cookie name includes tenantId + exact host domain — Pitfall 3 fully mitigated
- OTP provider generates 6-digit numeric code (D-08), 10-min window (T-04-04)
- DrizzleAdapter wired to Plan 02 schema — sessions/accounts/verificationTokens all tenant-scoped
- `signOutAction()` Server Action enables AUTH-04 sign-out from any page

## Task Commits
1. **Auth.js config, email sender, route handler, actions** - `8520c65`
2. **Auth unit tests** - (test commit)

## Deviations from Plan
None — plan executed as specified. `pnpm db:push` + auth integration tests require DATABASE_URL (same prerequisite as Plan 02).

## Next Phase Readiness
- Plan 05 can import `auth()` from `@/server/auth/config` in root layout
- Plan 06 can use `signOutAction()` in Navbar
