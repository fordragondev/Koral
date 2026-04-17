---
phase: 01-foundation
plan: "05"
subsystem: ui
tags: [next-intl, locale-routing, tailwind, theme]
requires:
  - phase: 01-02
    provides: DB schema + withTenant wrapper
  - phase: 01-03
    provides: Edge middleware + tenant resolution
provides:
  - Root layout injects per-tenant CSS custom properties (dark + light)
  - FOUC-prevention inline theme-init script
  - Locale layout with NextIntlClientProvider
  - Public home page (RSC, no hardcoded strings)
  - i18n request config loading common/nav/auth namespaces
affects: [all future phases that render UI]
tech-stack:
  added: []
  patterns: [per-tenant CSS custom properties, FOUC-safe theme init, locale layout pattern]
key-files:
  created: [src/app/layout.tsx, src/app/[locale]/layout.tsx, src/app/[locale]/page.tsx, tests/unit/theme.test.ts, tests/e2e/i18n.spec.ts]
  modified: [src/styles/globals.css, src/i18n/request.ts, src/messages/en/common.json, src/messages/es/common.json]
key-decisions:
  - "lang attribute on <div> not <html> — locale layout is nested under root, cannot re-declare html element"
  - "E2E tests require running dev server + seeded tenants — marked as manual verification"
patterns-established:
  - "Per-tenant CSS injection: getTenant() -> jsonb theme -> <style dangerouslySetInnerHTML>"
  - "FOUC prevention: synchronous inline <script> reads localStorage/OS pref before React hydrates"
  - "Locale layout: NextIntlClientProvider + setRequestLocale for RSC locale awareness"
requirements-completed: [TENT-01, TENT-03]
duration: 30min
completed: "2026-04-16"
---

# Phase 01 Plan 05: Locale Layout and i18n Routing Shell Summary

Root layout with per-tenant CSS injection and FOUC prevention (Task 1) plus locale-aware shell with NextIntlClientProvider and RSC home page wired to tenant data and i18n translations (Task 2).

## Accomplishments

### Task 1 (already committed before this execution)
- `src/app/layout.tsx` — root layout reads tenant theme from DB, injects CSS custom properties into `<style>`, and includes a synchronous FOUC-prevention inline `<script>` that reads `localStorage` / OS `prefers-color-scheme` before React hydrates
- `src/styles/globals.css` — `@theme` block wiring Tailwind v4 to the CSS custom properties emitted by the root layout
- `tests/unit/theme.test.ts` — 6 grep-based unit tests asserting root layout constraints (tenant CSS injection, FOUC script, no hardcoded hex colors, Tailwind v4 pattern)

### Task 2 (this execution)
- `src/app/[locale]/layout.tsx` — locale shell wrapping children in `NextIntlClientProvider`; `generateStaticParams` pre-renders both `en` and `es` routes; invalid locales return 404 via `notFound()`
- `src/app/[locale]/page.tsx` — RSC home page calling `getTranslations('common')` and `getTenant()` — no hardcoded strings
- `src/i18n/request.ts` — updated to load `common`, `nav`, and `auth` namespaces in parallel via `Promise.all`
- `tests/e2e/i18n.spec.ts` — four Playwright tests: EN home renders "Welcome", ES home renders "Bienvenido", root `/` redirects to locale prefix, unknown tenant returns 404

## Commits

| Hash | Message |
|------|---------|
| 92b4a56 | feat(01-05): root layout with per-tenant CSS injection and FOUC-prevention script (Task 1) |
| f127375 | feat(01-05): locale layout, home page RSC, i18n request config, E2E routing tests (Task 2) |

## Deviations from Plan

### Auto-decisions

**1. Message files not modified**
- **Found during:** Task 2 — reading `src/messages/en/common.json` and `src/messages/es/common.json`
- **Issue:** Files already contained all required keys (`welcome`, `loading`, `error`) with tenant-specific values ("Welcome to Aquarium Community", "Bienvenido a la Comunidad Acuario") that are richer than the plan's bare "Welcome" / "Bienvenido" stubs
- **Decision:** Left existing values intact — they satisfy the key requirements and are preferable for UX; the E2E test `text=Welcome` still matches "Welcome to Aquarium Community" via substring
- **Files modified:** none (no change needed)

**2. `playwright.config.ts` not modified**
- **Found during:** Task 2 — reading `playwright.config.ts`
- **Issue:** File already had a `webServer` block with `reuseExistingServer: true` (CI-gated); the plan's proposed addition was already present in equivalent form
- **Decision:** No modification needed

## Known Stubs

None. The home page renders real tenant data (`tenant.name`, `tenant.tagline`) sourced from the DB via `getTenant()`. The i18n keys resolve to real message strings.

## E2E Test Status

The Playwright tests in `tests/e2e/i18n.spec.ts` require:
- `pnpm dev` running against a live Neon database
- At least one seeded tenant row for `aquariumcommu.com`

They are NOT expected to pass in CI without a seeded DB. They serve as a runbook for manual verification and will be wired to the Neon preview branch in a later phase.

## Self-Check: PASSED

- `pnpm exec tsc --noEmit` — exit 0, no errors
- `pnpm vitest run tests/unit/theme.test.ts` — 6/6 passed
- `grep "NextIntlClientProvider" src/app/[locale]/layout.tsx` — matched
- `grep "getTranslations" src/app/[locale]/page.tsx` — matched
- `grep "nav" src/i18n/request.ts` — matched (3-namespace loading confirmed)
- `grep "Bienvenido" src/messages/es/common.json` — matched
- Commit f127375 exists with no unexpected file deletions
