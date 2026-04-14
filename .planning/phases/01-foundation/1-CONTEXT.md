# Phase 1: Foundation - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the multi-tenant shell that every subsequent phase depends on: per-domain routing and tenant resolution, per-domain account silos (same email = independent account per vertical), bilingual EN/ES with path-based locale routing, the 4-tier product hierarchy baked into the schema (Community → Groups → Verified Creators → Members), and per-vertical branding via a config-driven theming system. No content features, no feeds, no social graph — just the foundation.

First vertical: aquariums at `aquariumcommu.com`.

</domain>

<decisions>
## Implementation Decisions

### Logged-out Experience
- **D-01:** Full read access without sign-in. Visitors can browse the feed, read articles, and view discussions.
- **D-02:** Sign-in is only required to create content, comment, react, or join groups.
- **D-03:** This is essential for SEO — content pages must be publicly accessible and server-rendered.

### Sign-in / OTP Flow
- **D-04:** Passwordless only — no email/password login. Auth is via 6-digit email OTP code or OAuth (Google / Apple).
- **D-05:** Single unified flow for both sign-in and sign-up. User enters their email; if account exists they receive a code, if not the account is silently created and they receive a code. No separate "Register" page.
- **D-06:** "Code on first visit" model: after first successful auth, the session/cookie persists on that device. Subsequent visits on the same device are auto-authenticated until session expires.
- **D-07:** On a new device (or expired session), the OTP code flow re-runs — user enters email, receives a fresh 6-digit code.
- **D-08:** OTP code input uses a 6-digit segmented input with auto-advance between digit fields.
- **D-09:** OAuth (Google / Apple) is available at all times as an alternative to OTP.

### Account Silos
- **D-10:** Auth is fully per-domain. Same email address creates independent, unlinked accounts on `aquariumcommu.com` and any future vertical. There is no cross-vertical identity, shared session, or SSO.
- **D-11:** This must be enforced at the DB schema level (`UNIQUE(tenant_id, email)`), at the session level (session cookie carries `tenant_id`), and at the middleware level (every request asserts `session.tenant_id === middleware-resolved tenant_id`).

### Language Switching (i18n)
- **D-12:** On first visit, detect browser language and default to English or Spanish. If browser language is Spanish (`es`, `es-*`), default to `/es/`. Otherwise default to `/en/`.
- **D-13:** Language toggle visible in the navigation bar at all times, regardless of auth state.
- **D-14:** After sign-in, the user's preferred language is saved to their account and restored on next visit.
- **D-15:** URL path prefix for locale: `aquariumcommu.com/en/feed` and `aquariumcommu.com/es/feed`. This is required for SEO (hreflang and crawlability). Cookie-only locale storage is explicitly rejected.
- **D-16:** Middleware resolves locale in this priority order: URL prefix → cookie → `Accept-Language` header → tenant default locale (English).
- **D-17:** No machine translation. Spanish content must be authored in Spanish. Untranslated strings fall back to English visually during development, but no page goes live with hardcoded English strings.

### Per-Vertical Branding
- **D-18:** Branding is fully config-driven. A `tenants` table row defines all visual identity for each vertical — no code changes required to spin up a new vertical's branding.
- **D-19:** v1 branding scope includes: color palette (primary + accent colors, applied as CSS custom properties), logo + favicon, homepage hero/background imagery, and custom tagline + copy.
- **D-20:** Branding is applied via CSS custom properties on the root layout so every component inherits the vertical's theme without prop drilling.
- **D-21:** aquariumcommu.com visual direction: **deep ocean — dark + teal/cyan**. Two modes: dark (deep water) and light (bright reef). Both must look intentional, not just an inverted palette.

### Dark / Light Mode
- **D-27:** Both dark and light modes are supported from Phase 1. Not optional theming — both are designed intentionally per vertical.
- **D-28:** Default on first visit: follow the OS/system preference (`prefers-color-scheme`). No forced default.
- **D-29:** User can toggle dark/light via a sun/moon icon in the navigation bar, placed alongside the EN | ES language toggle.
- **D-30:** Preference is saved to `localStorage` immediately (works for logged-out visitors). When the user signs in, the preference syncs to their account and is restored on future visits across devices.
- **D-31:** Mode is implemented via a `data-theme` attribute on `<html>` (or a `.dark` class for Tailwind dark mode). CSS custom properties define color tokens for both modes — the per-vertical palette provides two sets of values (dark variant + light variant).

### Tenant Routing
- **D-22:** Domain/host → tenant resolution happens in Next.js Edge Middleware. Each incoming request reads the `host` header, looks up the tenant in Vercel Edge Config (sub-ms read), and stamps `x-tenant-id` into request headers for use by RSC and route handlers.
- **D-23:** All Drizzle queries run through a `tenantDb(tenantId)` wrapper that auto-applies `tenant_id` filters. Raw queries bypassing this wrapper are not permitted.
- **D-24:** New verticals are activated by adding a row to the `tenants` config table and an entry in Vercel Edge Config — no code deployment required.

### Product Hierarchy Schema
- **D-25:** The 4-tier hierarchy (Community → Groups → Verified Creators → Members) is baked into the DB schema in Phase 1 even though the reputation loop (points, auto-promotion, badges) ships in Phase 3.
- **D-26:** Avoids a schema migration later. Hierarchy-related columns that aren't yet used by the UI can be nullable or zero-defaulted until Phase 3 activates them.

### Group Model (replaces "Local Groups")
- **D-32:** Geographic groups (country/city nodes) are **not** part of the group model. Creating country or city-level containers would fragment the community — aquarium hobbyists everywhere should interact in one unified feed.
- **D-33:** Groups are **interest/activity based**, not geographic. Examples: "Planted Tank Enthusiasts", "Saltwater Beginners", "Monthly Fish Swap NYC". Location is an optional field on a group, not a required parent container.
- **D-34:** Geography is a property of **events only** — events have a city/country tag so users can discover local meetups. No geographic group hierarchy exists.
- **D-35:** Any member can create a group. Groups have: name, description, optional location, cover photo, and a dedicated chat room for members.
- **D-36:** The `groups` table in the schema drops the required `city/region` column from the original requirements — location is `nullable`. This overrides GRP-01 in REQUIREMENTS.md (flagged for update).

### Claude's Discretion
- Auth.js v5 specific session configuration and cookie settings
- Exact Drizzle schema structure (table names, column types, index strategy)
- Edge Config data structure for tenant registry
- OTP code expiry window and rate limiting thresholds
- Vercel environment variable naming conventions
- Loading/skeleton states during tenant resolution

</decisions>

<specifics>
## Specific Ideas

- Aquarium theme: deep ocean — dark + teal/cyan for dark mode, bright reef feel for light mode. Both modes designed intentionally, not just palette inversions.
- The 6-digit OTP input should feel snappy — auto-advance between digit fields, auto-submit on last digit entry, no separate submit button needed.
- Language toggle in the nav bar should be a simple `EN | ES` text toggle, not a dropdown with flag icons.
- The "code on first visit" model means the platform feels frictionless after first sign-in — users on mobile especially should not be re-entering codes repeatedly.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Core value, constraints, key decisions (multi-tenant model, account silos, stack)
- `.planning/REQUIREMENTS.md` — AUTH-01–05, TENT-01–04, HIER-01 (Phase 1 requirements)
- `.planning/ROADMAP.md` — Phase 1 success criteria and dependency constraints

### Research findings
- `.planning/research/STACK.md` — Prescriptive stack recommendations: Auth.js v5 + Drizzle + Neon + Vercel Edge Config + next-intl. Read before choosing any library.
- `.planning/research/ARCHITECTURE.md` — Tenant resolution pattern, per-domain silo schema, i18n routing, CSS custom property theming, 15-step build order. Section 1 (tenant resolution), Section 2 (data model), Section 3 (account silos), Section 5 (i18n routing), Section 4 (theming) are load-bearing for this phase.
- `.planning/research/PITFALLS.md` — Pitfalls 1–4 are Phase 1 critical: missing tenant_id filters, auth silo bugs, cookie domain cross-contamination, Next.js middleware gotchas. Read before writing any auth or query code.
- `.planning/research/SUMMARY.md` — Cross-cutting findings; "Tenant isolation is load-bearing" and "i18n is a day-one constraint" sections are directly relevant.

No external specs or ADRs beyond the planning artifacts above — this is a greenfield project.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing components, hooks, or utilities.

### Established Patterns
- None yet — Phase 1 establishes the patterns that all subsequent phases follow.

### Integration Points
- This phase creates the tenant context, auth session, and i18n provider that ALL subsequent phases consume. Every feature phase depends on these primitives being correctly established here.

</code_context>

<deferred>
## Deferred Ideas

- None surfaced during discussion — conversation stayed within Phase 1 scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-13*
