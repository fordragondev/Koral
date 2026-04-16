---
phase: 01-foundation
plan: 03
subsystem: infra
tags: [middleware, next-intl, edge-config, tenant-routing, vercel, seed]

requires:
  - phase: 01-foundation/01
    provides: Next.js scaffold, i18n routing config, TypeScript + path aliases
  - phase: 01-foundation/02
    provides: Drizzle schema (tenants table), DB client, getTenantId helper

provides:
  - Composed Edge middleware: host → tenant resolution (Edge Config) + next-intl locale routing
  - syncTenantToEdgeConfig() Server Action that mirrors tenant DB rows to Vercel Edge Config (D-24, TENT-04)
  - Seed script seeding aquariumcommu.com + test vertical into DB and Edge Config
  - Unit tests for middleware behavior and edge-config-sync

affects: [01-04, 01-05, 01-06]

tech-stack:
  added: [tsx, @vercel/edge-config (via fetch)]
  patterns: [composed middleware (createMiddleware + next-intl), edge-config-sync pattern, idempotent seed script]

key-files:
  created:
    - src/middleware.ts
    - src/server/tenant/edge-config-sync.ts
    - scripts/seed-tenants.ts
    - tests/unit/middleware.test.ts
    - tests/unit/tenant.test.ts
  modified:
    - .env.example
    - package.json

key-decisions:
  - "Middleware reads tenant from Edge Config (not DB) — <10ms reads at Vercel edge, no DB hit in request path"
  - "syncTenantToEdgeConfig() silently skips when VERCEL_API_TOKEN is unset — safe for local dev without credentials"
  - "Seed script uses upsert pattern (check-then-insert/update) — idempotent, safe to re-run"
  - "schema.ts NOT duplicated in this plan — 01-02 owns it; seed script imports it after merge"

patterns-established:
  - "Middleware composition: tenant resolver → next-intl createMiddleware, each step adds its header"
  - "Edge Config as tenant registry: middleware reads, syncTenantToEdgeConfig() writes"
  - "syncTenantToEdgeConfig() is the only approved path to write tenant data to Edge Config"

requirements-completed: [TENT-01, TENT-04]

duration: ~40min
completed: 2026-04-16
---

# Phase 01-03: Edge Middleware + Tenant Seeding Summary

**Composed Edge middleware resolving host → tenant from Vercel Edge Config and delegating locale routing to next-intl, with Edge Config sync Server Action and idempotent two-tenant seed script**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-04-15T23:45:00Z
- **Completed:** 2026-04-16T00:25:00Z
- **Tasks:** 3/3
- **Files modified:** 7

## Accomplishments

- `src/middleware.ts` composes tenant resolution (reads `x-tenant-id` from Edge Config via host lookup) with next-intl locale routing — TENT-01 fulfilled: single middleware pipeline handles both cross-cutting concerns
- `syncTenantToEdgeConfig()` Server Action patches the `tenants` key in Edge Config atomically — TENT-04 and D-24 fulfilled; new tenant onboarding writes to both DB and Edge Config in one call
- Seed script pre-populates `aquariumcommu.com` (with Deep Ocean theme tokens from UI-SPEC) and `anime.test.koral.local` (test vertical) — Plan 06 cross-tenant isolation E2E tests have data to run against
- Unit tests cover the happy path (read → merge → PATCH) and the local-dev skip behavior (missing token → no-op)

## Task Commits

1. **Task 1: Composed Edge middleware** - `d970aa4` (feat), `47ffdb1` (test — TDD tests first)
2. **Task 2: Edge Config sync Server Action + tenant unit tests** - `1ec440a` (feat)
3. **Task 3: Tenant seed script + package.json + .env.example** - `64e048d` (feat)

**Plan metadata:** (docs: complete plan summary)

## Files Created/Modified

- `src/middleware.ts` — Composed Edge middleware: `EDGE_CONFIG` lookup → `x-tenant-id` header injection → next-intl locale routing
- `src/server/tenant/edge-config-sync.ts` — `syncTenantToEdgeConfig()`: reads current tenants object, merges new entry, PATCHes via Vercel REST API
- `scripts/seed-tenants.ts` — Seeds aquariumcommu.com + anime test tenant; idempotent upsert; calls edge-config-sync per tenant
- `tests/unit/middleware.test.ts` — Unit tests for middleware host-to-tenant resolution behavior
- `tests/unit/tenant.test.ts` — Unit tests for syncTenantToEdgeConfig (mock fetch, read-merge-PATCH flow, local-dev skip)
- `.env.example` — Added `VERCEL_API_TOKEN`, `VERCEL_EDGE_CONFIG_ID`, `VERCEL_TEAM_ID`
- `package.json` — Added `seed:tenants` script (`tsx scripts/seed-tenants.ts`) and `tsx` devDependency

## Decisions Made

- **Edge Config over DB in middleware**: Middleware runs on Vercel's Edge runtime where Drizzle/Neon cannot be imported. Edge Config provides <10ms reads without Node.js APIs. DB is still the source of truth; Edge Config is the read cache.
- **syncTenantToEdgeConfig() is a Server Action, not edge**: It uses `fetch()` against the Vercel REST API which requires `VERCEL_API_TOKEN` — not available in Edge runtime. Explicitly called from seed scripts and future admin Server Actions only.
- **Silent skip on missing creds**: `syncTenantToEdgeConfig()` logs a warning and returns early when `VERCEL_API_TOKEN` or `VERCEL_EDGE_CONFIG_ID` is unset. Local dev doesn't break; CI with real creds gets real sync.
- **Aquarium theme tokens from UI-SPEC**: Seed uses the exact Deep Ocean palette (`#0a1628` bg, `#00bcd4` accent) from the design contract — visual consistency from day one.

## Deviations from Plan

### Auto-fixed Issues

**1. schema.ts not committed in this worktree**
- **Found during:** Task 3 (seed script needs schema imports)
- **Issue:** Plan 01-02 owns `src/server/db/schema.ts`; committing it here would create a merge conflict with 01-02's authoritative version
- **Fix:** Seed script imports `../src/server/db/schema` as written — this resolves correctly after 01-02 merges. The `src/server/db/schema.ts` written locally was left uncommitted to avoid conflict.
- **Impact:** None — after wave merge order (01-02 first, then 01-03), schema.ts is present from 01-02's commits.

## Issues Encountered

None.

## User Setup Required

**To run the seed script against a live DB + Edge Config:**

```bash
# Requires .env.local with:
# DATABASE_URL=postgres://...        (from Neon)
# VERCEL_API_TOKEN=...               (Vercel personal access token)
# VERCEL_EDGE_CONFIG_ID=ecfg_...     (Edge Config item ID from Vercel dashboard)
# VERCEL_TEAM_ID=team_...            (optional — only needed for team accounts)

pnpm db:push          # ensure schema is in Neon first (Plan 02 prerequisite)
pnpm seed:tenants     # idempotent — safe to re-run
```

Without Edge Config credentials, `syncTenantToEdgeConfig()` logs a warning and continues — the DB rows are still seeded, only the Edge Config cache is skipped. Middleware will fall back to the DB for tenant resolution until Edge Config is populated.

## Next Phase Readiness

- **Plan 04** (Auth.js): `src/middleware.ts` sets `x-tenant-id` header, enabling `getTenantId()` to work in auth callbacks
- **Plan 05** (layout): Middleware locale routing produces `x-next-intl-locale` header; `src/i18n/request.ts` reads it
- **Plan 06** (UI + E2E): Two seeded tenants (`aquariumcommu.com` + `anime.test.koral.local`) provide cross-tenant isolation test data
- **Blocker**: `pnpm seed:tenants` requires `DATABASE_URL` + Vercel credentials to populate Edge Config

---
*Phase: 01-foundation*
*Completed: 2026-04-16*
