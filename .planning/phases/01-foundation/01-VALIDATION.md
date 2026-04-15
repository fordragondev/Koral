---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Playwright |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` — Wave 0 installs |
| **Quick run command** | `pnpm test:unit` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds (unit) / ~120 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | TENT-01 | — | Tenant resolved from host header | unit | `pnpm test:unit -- tenant` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | TENT-02 | — | Edge Config lookup returns config | unit | `pnpm test:unit -- tenant` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | TENT-03 | — | x-tenant-id header injected | unit | `pnpm test:unit -- middleware` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | AUTH-01 | T-1-01 | OTP auth scoped to tenant_id | integration | `pnpm test:unit -- auth` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | AUTH-02 | T-1-01 | UNIQUE(tenant_id, email) enforced | integration | `pnpm test:unit -- auth` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | AUTH-03 | — | Session carries tenant_id in JWT | unit | `pnpm test:unit -- auth` | ❌ W0 | ⬜ pending |
| 1-02-04 | 02 | 1 | AUTH-04 | — | OAuth (Google) flow completes | e2e | `pnpm test:e2e -- auth` | ❌ W0 | ⬜ pending |
| 1-02-05 | 02 | 1 | AUTH-05 | — | Sign-out clears session | e2e | `pnpm test:e2e -- auth` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | TENT-04 | — | Theme CSS vars applied from tenant config | unit | `pnpm test:unit -- theme` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 2 | HIER-01 | — | Schema includes all 4-tier hierarchy tables | integration | `pnpm test:unit -- schema` | ❌ W0 | ⬜ pending |
| 1-05-01 | 05 | 3 | — | — | EN/ES locale routing works | e2e | `pnpm test:e2e -- i18n` | ❌ W0 | ⬜ pending |
| 1-05-02 | 05 | 3 | — | — | Language toggle persists preference | e2e | `pnpm test:e2e -- i18n` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration with path aliases
- [ ] `playwright.config.ts` — Playwright E2E config targeting localhost
- [ ] `tests/unit/tenant.test.ts` — stubs for TENT-01/02/03
- [ ] `tests/unit/auth.test.ts` — stubs for AUTH-01/02/03
- [ ] `tests/unit/theme.test.ts` — stubs for TENT-04
- [ ] `tests/unit/schema.test.ts` — stubs for HIER-01
- [ ] `tests/e2e/auth.spec.ts` — stubs for AUTH-04/05
- [ ] `tests/e2e/i18n.spec.ts` — stubs for locale routing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dark/light mode FOUC prevention | D-27–31 | Requires real browser render timing | Load page in browser, observe no flash before React hydrates |
| Apple OAuth flow | AUTH-04 | Apple OAuth requires real credentials and device | Stub in Phase 1, verify pre-launch |
| New vertical activation (no code deploy) | TENT-03 | Requires Vercel Edge Config write access | Add tenant row to DB + Edge Config; verify routing resolves without redeploy |
| Language detection from Accept-Language | D-12/D-16 | Browser locale simulation needed | Set browser language to Spanish, verify /es/ redirect on first visit |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
