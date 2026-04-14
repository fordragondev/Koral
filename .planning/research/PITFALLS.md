# Pitfalls Research

**Domain:** Multi-tenant niche social / community platform (Next.js + Postgres on Vercel)
**Researched:** 2026-04-13
**Confidence:** HIGH (domain-specific; patterns are well-established in multi-tenant SaaS literature and community platforms)

---

## Critical Pitfalls

### Pitfall 1: Missing `tenant_id` Filter — Cross-Tenant Data Leak

**What goes wrong:**
A query anywhere in the app omits `WHERE tenant_id = ?`. One user on `animecommu.com` can read, list, or modify records belonging to `aquariumcommu.com`. This is a data breach and a trust-destroying incident, not just a bug.

**Why it happens:**
Developers write a quick helper (`getUserById`, `getPostBySlug`) and forget to thread `tenant_id` through it. In a shared DB the SQL is otherwise valid — it returns data, just the wrong tenant's data. Tests pass because test data only contains one tenant. The bug survives to production.

**How to avoid:**
- Enforce the `tenantDb(tenantId)` wrapper pattern described in STACK.md. Every Drizzle query must go through this wrapper. The wrapper prepends `.where(eq(table.tenantId, tenantId))` for every query on tenant-scoped tables.
- Add a `tenant_id IS NOT NULL` check constraint on every table that is tenant-scoped.
- Write an integration test that seeds two tenants, performs every read operation as tenant A, and asserts that no tenant B records appear.
- Add a CI lint rule that flags any direct `db.select().from(table)` call that does not chain `.where(... tenantId ...)` — this can be a custom ESLint rule or a code-review checklist item.

**Warning signs:**
- New query helpers written without a `tenantId` parameter.
- Any query that takes a generic `id` and returns a full row without also filtering on `tenant_id`.
- Test suite that only ever seeds one tenant.

**Phase to address:** Foundation / Data Layer phase (schema design + Drizzle wrapper). This must be baked in before any feature work begins. Retrofitting tenant isolation onto existing queries is expensive and error-prone.

---

### Pitfall 2: Per-Domain Account Silo Broken by Weak Constraints

**What goes wrong:**
A user registers `alice@example.com` on `aquariumcommu.com`. They later register the same email on `animecommu.com`. Without a composite unique constraint `UNIQUE(tenant_id, email)`, the second registration silently reuses or collides with the first row, leaking session state, profile data, or moderation history across domains.

Password reset is the most dangerous failure: a reset email is sent based on email alone, without scoping to tenant. The reset token lands in the user's inbox and resets the password on a different tenant than the one the user intended — or worse, on all tenants simultaneously.

**Why it happens:**
Auth flows are typically written once, for a single-tenant app. The email uniqueness index is written as `UNIQUE(email)`. Tenant scoping is added as an afterthought and the constraint is never updated. Password reset queries `WHERE email = ?` — the tenant header is not consulted.

**How to avoid:**
- Schema: `UNIQUE(tenant_id, email)` composite constraint. Never `UNIQUE(email)` alone on a tenant-scoped users table.
- Session JWT: include `tenantId` in the payload. Validate on every request that the JWT's `tenantId` matches the request's host-derived tenant.
- Password reset: scope the token lookup to `(tenant_id, email, token)`. The reset link must encode the tenant (either via subdomain/domain or a signed tenant parameter).
- Auth.js `authorize` callback: always read `x-tenant-id` from the request headers before any DB lookup.
- Session cookies: set `Domain` attribute to the specific tenant domain (e.g. `aquariumcommu.com`), never to a shared parent. On Vercel with custom domains this is the default, but verify explicitly.

**Warning signs:**
- `users` table has a `UNIQUE(email)` index without `tenant_id`.
- Password reset handler queries `WHERE email = $1` without `AND tenant_id = $2`.
- Session JWT payload does not contain `tenantId`.

**Phase to address:** Authentication phase. The composite constraint and scoped reset flow must be part of the initial auth implementation, not a later hardening pass.

---

### Pitfall 3: Session Cookies Bleeding Across Tenant Domains

**What goes wrong:**
Session cookies set with `Domain=.vercel.app` (or any shared apex) are readable by all tenants if they share a parent domain. On Vercel preview deployments, all preview URLs share `.vercel.app`. A user authenticated on one preview tenant can be seen as authenticated on another.

In production, if two tenants share a common apex (e.g. `*.commu.com`), a cookie set for `.commu.com` is sent by the browser to all subdomains, including other tenants.

**Why it happens:**
Developers deploy to Vercel and do not override the default cookie domain. Auth.js defaults are fine for single-tenant but require explicit override for multi-tenant.

**How to avoid:**
- In Auth.js v5 config, set `cookies.sessionToken.options.domain` to the exact current host (read from the request), never to a wildcard parent.
- For Vercel preview deployments: either accept that preview URLs are single-tenant-only (document this) or use tenant-scoped preview URLs.
- Add an E2E test: authenticate as tenant A, switch to tenant B in the same browser session, assert the tenant B session is absent.
- If using `*.commu.com` subdomains for any tenant, treat each subdomain as a separate origin for cookies.

**Warning signs:**
- Auth.js config does not explicitly set `cookies.sessionToken.options.domain`.
- Tests pass against `localhost` but not against distinct domains.

**Phase to address:** Authentication phase, specifically the multi-domain session configuration step.

---

### Pitfall 4: Next.js Middleware Doing Too Much — Edge Runtime Constraints

**What goes wrong:**
The tenant-resolution middleware grows to include Drizzle queries, Node.js crypto calls, or dynamic imports. The Edge runtime does not support Node.js APIs (`fs`, `crypto`, `Buffer` in some usages, native addons). The build compiles; the middleware silently fails at runtime, or worse, throws an unhandled error that takes down all tenant routing.

A secondary failure: middleware re-executes on every request including `_next/static` assets, `_vercel` health checks, and favicon requests. Without a tight `matcher`, middleware runs hundreds of extra times per page load, burning CPU and slowing cold starts.

**Why it happens:**
Middleware is convenient — it's a single chokepoint. Developers gradually add logic (auth checks, feature flags, A/B routing) without tracking cumulative weight. Node API calls are easy to miss because TypeScript types don't catch them; they only fail at runtime on the Edge.

**How to avoid:**
- Keep middleware to: host → tenant slug resolution (from Edge Config only, no DB), locale detection, and header injection. Nothing else.
- Read tenant config from Vercel Edge Config (instant, Edge-compatible). Never read from Drizzle in middleware.
- Tighten the `matcher` regex to exclude static assets, API routes, and Vercel internals.
- Test middleware logic in the Vercel Edge runtime locally (`vercel dev`) before deploying, not just with `next dev`.
- Feature flags, auth checks, and per-user logic belong in Server Components / Route Handlers, not middleware.

**Warning signs:**
- `middleware.ts` imports anything from `drizzle-orm`, `@neondatabase/serverless`, or Node built-ins.
- `matcher` is too broad (e.g. `['/(.*)', '/api/(.*)']`).
- Middleware file exceeds ~5KB.

**Phase to address:** Foundation / Multi-Tenant Routing phase. Set the constraint in the first middleware commit and enforce it in PR reviews.

---

### Pitfall 5: Realtime on Vercel Serverless — Connection Limits and Billing Surprises

**What goes wrong:**
Pusher's free tier allows 100 concurrent connections and 200k messages/day. A niche community with 200 active users in a chat room at the same time blows the connection limit. Upgrading to Pusher's paid tier introduces per-connection monthly charges that scale linearly with DAUs — for a bootstrapped platform, this becomes a significant cost before revenue.

A secondary failure: developers attempt to hold WebSocket connections from Next.js Route Handlers on Vercel. Vercel serverless functions time out after 10s (or 60s on Pro) — long-polling and WebSocket upgrade do not work. The connection silently drops; the client reconnects in a loop; bills spike from function invocations.

**Why it happens:**
Early development uses `localhost` where there are no connection limits. The Pusher dashboard shows "100 concurrent" as a hard cap, but it only becomes visible under real load. The billing page is not checked during architecture planning.

**How to avoid:**
- Accept Pusher for v1 (one vertical, low-traffic launch) but design the realtime event shape as an abstraction (`emitEvent(channel, event, data)`) so switching to Ably is a one-file change.
- Monitor Pusher dashboard from day one. Set a billing alert.
- Never attempt to hold long-lived connections from Vercel Route Handlers. All WebSocket work goes through Pusher/Ably exclusively.
- Plan the Ably migration trigger: "if concurrent connections exceed 80 or monthly Pusher cost exceeds $X, migrate."

**Warning signs:**
- Pusher dashboard showing >70 concurrent connections in early beta.
- Any Next.js API route that uses `res.write()` / streaming without a proper Edge streaming pattern.

**Phase to address:** Realtime phase. Architect the abstraction layer from the start.

---

### Pitfall 6: AI-Generated Content Triggering Google Spam Penalties

**What goes wrong:**
Google's Helpful Content system (now integrated into core ranking) penalizes sites where AI-generated content is thin, repetitive, or clearly not written for humans. A founding-content strategy that publishes 500 AI-drafted articles with minimal human curation can suppress the entire domain's ranking — including the genuinely valuable UGC that arrives later. Recovery from a helpful-content penalty takes months and is not guaranteed.

A secondary failure specific to multi-tenant: the same AI-drafted article (or a near-duplicate) appears on multiple tenant domains (e.g. a "water quality" guide on `aquariumcommu.com` and a re-skinned version on a future vertical). Google treats this as duplicate content across domains and devalues both.

**Why it happens:**
The founding-content workflow produces articles quickly. The human-curation step is underestimated: reviewing 500 articles to add genuine expertise, real examples, and original perspective is a significant time investment that gets skipped under launch pressure.

**How to avoid:**
- Human curation is not optional. Every AI-drafted article must pass a "does this add something a real hobbyist would find genuinely useful?" bar before publishing.
- Publish fewer, better articles rather than many thin ones. 30 excellent guides outperform 500 thin stubs for SEO.
- Use `<link rel="canonical">` and structured data correctly. Drafts and unpublished versions must not be indexable.
- For cross-vertical content: never syndicate the same article. Either rewrite substantially or use canonical tags pointing to the authoritative tenant.
- Add `noindex` to any AI-drafted content that has not passed human review. Remove `noindex` only after curation.
- Track Google Search Console for "thin content" manual actions or sudden ranking drops per domain.

**Warning signs:**
- Publishing AI drafts directly without a review queue.
- Any article under 600 words that exists only as a topic stub.
- Multiple tenant domains with >50% content overlap.

**Phase to address:** Content / SEO phase. The review queue and `noindex`-by-default workflow must be built before the first article is published.

---

### Pitfall 7: SEO Multi-Tenant — Canonicals, Sitemaps, hreflang Done Wrong

**What goes wrong:**
Three compounding failures:
1. Canonical tags point to the wrong tenant domain (e.g. all tenants' pages canonicalize to `aquariumcommu.com`), causing every other tenant's SEO value to be donated to the first tenant.
2. Sitemaps are generated globally and served at `yourdomain.com/sitemap.xml` instead of per-tenant at each domain. Google indexes URLs from the wrong domain.
3. `hreflang` annotations are missing or wrong. The EN and ES versions of an article reference each other with the wrong href — or the `x-default` tag is missing. Google serves the wrong locale to users, inflating bounce rates.

**Why it happens:**
Canonical and sitemap logic is written once for a single domain. When the multi-tenant routing is added, the domain is hard-coded or read from an env var instead of from the current request. `hreflang` is treated as an afterthought and skipped at launch "to add later."

**How to avoid:**
- Canonical URL must be derived from `headers().get('host')` (the actual tenant domain), not from a hard-coded env var or `NEXT_PUBLIC_BASE_URL`.
- Sitemap: implement a dynamic `/sitemap.xml` route handler that reads the current host, queries only that tenant's published content, and returns the correct URLs.
- `hreflang`: for each article with both EN and ES versions, emit:
  ```html
  <link rel="alternate" hreflang="en" href="https://[domain]/en/articles/[slug]" />
  <link rel="alternate" hreflang="es" href="https://[domain]/es/articles/[slug]" />
  <link rel="alternate" hreflang="x-default" href="https://[domain]/articles/[slug]" />
  ```
  Missing `x-default` is a common omission that confuses Google.
- Add a dev-time assertion: crawl a sample of pages and verify `canonical`, `og:url`, and `sitemap` all reference the same host as the request.

**Warning signs:**
- `NEXT_PUBLIC_BASE_URL` used in canonical or OG tags without reading the host header.
- `next-sitemap` configured with a single `siteUrl` value (it must be dynamic per tenant).
- Any article page missing `hreflang` tags when both EN and ES versions exist.

**Phase to address:** SEO / Content phase, immediately when article pages are built.

---

### Pitfall 8: i18n Debt — Hardcoded Strings That Don't Scale

**What goes wrong:**
English strings are hardcoded in JSX during fast feature development. When the ES translation pass begins, developers find hundreds of strings scattered across components, some context-dependent (pluralization, gender agreement in Spanish). The translation effort is larger than building the original feature. Machine translation is tempting as a shortcut but produces awkward, off-brand Spanish that undermines the "built for this community" feeling.

A structural failure: UI strings, dynamic content strings (article categories, error messages from the DB), and email template strings are treated as three separate systems instead of one `next-intl` message namespace. Each is translated independently and inconsistently.

**Why it happens:**
"I'll add i18n at the end" is a classic dev trap. The cost of retrofitting i18n is always higher than building it in from the start, especially with ICU plural/select rules in Spanish.

**How to avoid:**
- No hardcoded strings in JSX from day one. Every user-visible string goes through `t('key')` from `next-intl`. This is a non-negotiable rule.
- Create message namespaces: `common`, `nav`, `auth`, `feed`, `article`, `chat`, `moderation`. Never one giant `messages.json`.
- Spanish is not a translation — it is a co-equal first-class locale. Hire or commission a native speaker for review before launch, even if the initial drafts are done by a bilingual developer.
- Email templates: use `next-intl`'s server-side `getTranslations` in the email-sending Server Action / Inngest job. Same message files, same keys.
- Dynamic DB content (category names, tag labels): store EN and ES in the DB row (`name_en`, `name_es`) rather than translating at render time.

**Warning signs:**
- Any JSX file with string literals that are user-visible.
- A `messages/en.json` file with >200 keys in a flat structure (indicates missing namespaces).
- Error messages thrown from Server Actions that are in English only.

**Phase to address:** Foundation phase. Enforce the `t('key')` rule in the first layout commit. Retrofitting later is a sprint-level undertaking.

---

### Pitfall 9: Media Storage Cost Runaway from Photo Uploads

**What goes wrong:**
Users upload original photos from modern smartphones — 8–20MB RAW JPEG per photo. Without server-side compression, a moderately active community generates gigabytes of storage per month. Cloudflare R2's storage cost is $0.015/GB/month (cheap), but Vercel's image optimization has a quota of 1,000 source images/month on the free plan and 5,000 on Pro. Once exceeded, `next/image` falls back to unoptimized originals, serving 15MB images to mobile users.

A secondary failure: blurhash placeholders, thumbnails, and OG images are not generated at upload time. They are generated on-demand on first request, causing slow first loads and potential cold-start timeouts.

**Why it happens:**
During development, uploads are tested with small images. The upload pipeline is built to store originals faithfully. Compression and thumbnail generation are deferred as "optimizations." By the time storage costs appear, there are already thousands of uncompressed originals.

**How to avoid:**
- Process photos at upload time via `sharp` (or a Cloudflare Worker): resize to a max of 2048px on the long edge, re-encode as WebP at 85% quality. Store the WebP as the canonical version, discard the original unless the user is a verified contributor.
- Generate a 400px thumbnail and a `thumbhash` at upload time. Store both on the media row.
- Generate OG images at publish time (via Inngest job), not on first request.
- Set `next/image` `remotePatterns` to your R2 bucket only. Track Vercel image optimization usage in the Vercel dashboard; set an alert.
- If image transformation volume grows beyond Vercel's quota, route `next/image` optimization through Cloudflare Images or `imgproxy` instead.

**Warning signs:**
- Upload handler stores raw `multipart/form-data` bytes directly to R2 without processing.
- Vercel image optimization usage chart approaching quota in the first month.
- Any article page loading images >500KB in the browser network tab.

**Phase to address:** Media / Upload phase. Build the `sharp` pipeline into the first upload implementation.

---

### Pitfall 10: Moderation Blind Spots — CSAM, Doxxing, Harassment

**What goes wrong:**
A volunteer moderation model means content review latency can be hours or days. Three categories are catastrophically underestimated by solo devs:

1. **CSAM (Child Sexual Abuse Material):** Any platform accepting photo uploads is legally required in the US to report CSAM to NCMEC under 18 U.S.C. § 2258A. Non-compliance is a federal crime. "We're a niche hobbyist community" is not a defense. Attackers specifically target low-moderation platforms.

2. **Doxxing:** Publishing someone's home address, phone number, or workplace in a community post causes immediate real-world harm. Forums are frequently used as coordination points for targeted harassment.

3. **Harassment escalation:** Volunteer mods lack authority and tools. Without an escalation path (report → trained mod → admin → platform ban), bad actors outlast volunteer moderators through attrition.

**Why it happens:**
Solo devs building for passionate hobbyists assume a benign community. Safety infrastructure is treated as a v2 concern. The moderation UI is a simple "flag this post" button with no enforcement tooling.

**How to avoid:**
- Integrate PhotoDNA or Microsoft's Azure Content Safety (or equivalent CSAM hash-matching service) at upload time. This is not optional if you accept image uploads. Budget for this in v1.
- Add rate limiting on all media uploads per user per day (Upstash rate limiter). This limits automated CSAM upload attempts.
- Implement account suspension and content removal tools for admins before launch, not after a first incident.
- Add a clear "report" flow with category options (CSAM, harassment, doxxing, spam). Reports go to an admin queue, not just volunteer mods.
- Write and publish a community safety policy before accepting any public signups.
- For doxxing: server-side scan post content for patterns (phone numbers, physical addresses) using a regex pre-publish check. Flag for review, don't auto-publish.

**Warning signs:**
- No image moderation service integrated.
- Report flow only notifies volunteer mods, not the platform admin.
- No account suspension tool exists at launch.

**Phase to address:** Moderation / Safety phase — must be complete before any public user registration is allowed, even in beta.

---

### Pitfall 11: Instagram/WhatsApp Crossposting — Meta API Approval Friction and Rate Limits

**What goes wrong:**
The Meta Graph API for Instagram posting requires app review for the `instagram_content_publish` permission. Review takes 1–4 weeks and requires a working demo, privacy policy, data deletion callback, and a test account with a business Instagram profile. WhatsApp Business API requires a separate Meta Business verification process.

Rate limits: Instagram allows 25 API-published posts per 24-hour window per Instagram account. On a high-activity vertical, a single trending thread generating 25+ crossposts in a day hits this ceiling silently — posts queue up and either fail or deliver hours late.

OAuth scopes: requesting `pages_manage_posts` in addition to `instagram_content_publish` triggers a more invasive review process. The crosspost-out-only use case needs only `instagram_content_publish` — do not request broader scopes.

**Why it happens:**
Developers assume Meta API access is like most OAuth providers — register an app, get a token, start calling APIs. Meta's review process is stricter and slower than expected. Building the crossposting feature in phase 1 and then waiting 3 weeks for approval blocks the launch.

**How to avoid:**
- Submit the Meta app review request at the start of the project, not when crossposting is feature-complete. Review can run in parallel with development.
- Build a mock crosspost endpoint for local dev and staging that logs the payload but does not call Meta. This prevents dev from blocking on API access.
- Request only `instagram_content_publish` and `whatsapp_business_messaging` — nothing broader.
- Implement a crosspost queue (Inngest job) with retry logic. Instagram's 25-post daily limit resets at midnight Pacific; queue excess jobs for the next window.
- Store `crosspost_status` (pending / published / failed / rate_limited) on each crosspost job row for observability.
- Set `QStash` or Inngest scheduled jobs to drain the queue after the rate limit window resets.

**Warning signs:**
- Crosspost feature developed without a Meta app review submission in progress.
- Crosspost calls made directly from a Server Action without a queue.
- Requesting `pages_manage_posts` scope when you only need `instagram_content_publish`.

**Phase to address:** Social Integration phase. Submit Meta app review in parallel. Do not block the launch on crossposting approval — launch without it and add it when approved.

---

### Pitfall 12: GDPR Data Export When Accounts Are Siloed but DB Is Shared

**What goes wrong:**
A user on `aquariumcommu.com` submits a "download my data" GDPR request. The implementation queries all tables for `user_id = X` — but the user has also registered on `animecommu.com` with the same email. The export either includes both tenants' data in one file (crossing silo boundaries) or silently omits one tenant's data (incomplete, still GDPR non-compliant).

A deletion request ("right to be forgotten") is worse: deleting `user_id = X` across all tables without tenant scoping deletes the user's data from all tenants, not just the one where they requested deletion.

**Why it happens:**
GDPR tooling is usually built once against `user_id`. The multi-tenant dimension (one person, multiple `user_id` rows across tenants) is invisible to the implementation because the shared email is a lookup key, not a FK the code follows.

**How to avoid:**
- Data export: scope strictly to `(user_id, tenant_id)`. The export includes only data from the tenant the request was submitted on. Document this explicitly in the privacy policy.
- Deletion: cascade deletes via FK constraints, not application code. Write a `DELETE FROM users WHERE id = ? AND tenant_id = ?` — never `WHERE id = ?` alone.
- Add a `data_requests` table with columns `(id, user_id, tenant_id, type, status, created_at, completed_at)`. Inngest job processes the request asynchronously and emails the user when complete.
- GDPR compliance is scoped per tenant: a deletion on one tenant does not affect the user's account on another tenant (they are legally separate accounts under the silo model).

**Warning signs:**
- Data export query joins across all user content without a `tenant_id` filter.
- No `data_requests` table or deletion workflow exists.

**Phase to address:** Auth / Compliance phase. Design the deletion cascade and export workflow alongside the user schema.

---

### Pitfall 13: Over-Engineering the Multi-Tenant Layer Before Any Vertical Has Users

**What goes wrong:**
The multi-tenant framework — tenant registry, routing, theming, per-tenant configuration, per-tenant feature flags, per-tenant billing hooks — is built to support 50 verticals before the first vertical has a single real user. The solo dev spends 6 weeks on infrastructure and ships nothing users can interact with. When the first vertical launches, the actual UX problems (onboarding clarity, content discovery, mobile layout) dwarf the architectural concerns.

**Why it happens:**
Multi-tenancy is architecturally interesting. It's easier to optimize infrastructure than to face the uncertainty of whether users will actually engage with the product. The "but it needs to scale to 50 verticals" reasoning is used to justify premature abstraction.

**How to avoid:**
- Build only what is needed for one vertical at launch. The tenant registry should support adding a second tenant in an afternoon (a row in a DB table + a domain config), not days.
- Defer: per-tenant billing, per-tenant feature flag overrides, per-tenant email templates, per-tenant content moderation rule sets. These are v2 concerns.
- The STACK.md routing pattern (Edge Config + header injection) is the right level of abstraction for v1. Do not build beyond it.
- Launch velocity rule: if a piece of multi-tenant infrastructure has no immediate impact on the first vertical's users, defer it.

**Warning signs:**
- Sprint velocity measured in infrastructure abstractions, not user-facing features.
- Tenant config schema has >10 fields before a second tenant exists.
- Any work labeled "makes it easier to onboard the 10th vertical."

**Phase to address:** Every phase. This is a discipline issue, not a technical one. Call it out in sprint planning.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip `tenant_id` in a "one-off" query helper | Faster to write | Data leak, security incident | Never |
| Machine-translate ES strings at launch | No Spanish writer needed | SEO penalty, user distrust, full retranslation later | Never |
| Hard-code `NEXT_PUBLIC_BASE_URL` in canonical tags | Easy to set up | Wrong canonicals across all tenants, SEO damage | Never |
| Publish AI drafts without human review | More content faster | Google Helpful Content penalty; domain-level ranking suppression | Never |
| Skip CSAM scanning "for now" | Saves integration time | Legal liability, NCMEC reporting obligation | Never |
| Use `UNIQUE(email)` instead of `UNIQUE(tenant_id, email)` | Simpler schema | Account silo breach, password-reset cross-leak | Never |
| Direct Meta API calls (no queue) for crossposting | Simpler code | Silent failures at rate limit; no retry or observability | MVP only if <5 posts/day, replace before launch |
| Postgres FTS without per-locale tsvector columns | Faster to implement | Poor Spanish stemming, irrelevant search results | Never if bilingual from day one |
| Store original photo without compression | Preserves quality | Storage and bandwidth cost runaway | Never for UGC; only for verified pro contributors |
| Build 10 tenant config fields before second tenant exists | "Future-proof" | Wasted dev time, complexity with zero ROI | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Pusher** | Subscribing to channels without auth (public channels for private data) | Use private channels (`private-`) for all user/tenant data; implement the Pusher auth endpoint in a Next.js route handler scoped to `tenant_id` |
| **Auth.js v5** | Reading `session.user` without verifying `tenantId` matches the current host | Always re-derive tenant from `headers().get('x-tenant-id')` in Server Components; treat JWT `tenantId` as a trust signal, not a source of truth for routing |
| **Meta Graph API** | Building crossposting before app review is submitted | Submit review the day you start the sprint; build against a local mock |
| **Cloudflare R2** | Serving R2 URLs directly (exposing bucket paths, no CDN) | Use a Cloudflare-fronted public bucket domain for all served media; presigned URLs only for private uploads |
| **Neon Postgres** | Using the standard `pg` driver in serverless routes | Always use `@neondatabase/serverless` (HTTP/WS driver) in Vercel functions; `pg` opens persistent connections that exhaust the pool under serverless concurrency |
| **Inngest** | Triggering AI draft workflow synchronously in a Server Action | Always fire-and-forget via `inngest.send()` from the Server Action; never await the full workflow inline |
| **next-intl** | Calling `getTranslations` with a hardcoded `locale: 'en'` | Always derive locale from the request context; never hard-code |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Feed query without cursor pagination | Feed page load grows linearly with post count | Implement keyset pagination (`WHERE created_at < cursor`) from day one | ~500 posts per tenant |
| Tenant config read from DB on every middleware execution | Middleware latency spikes; DB connections exhausted | Use Vercel Edge Config for tenant registry; never query Postgres in middleware | From day one under any real traffic |
| Full-table FTS scan without GIN index | Search degrades from fast to slow as post count grows | Create GIN index on `tsvector_en` and `tsvector_es` columns in initial migration | ~10k indexed rows per tenant |
| Uncompressed photo uploads served via `next/image` | Image optimization quota exhausted; Vercel bills spike | Compress at upload time with `sharp`; serve WebP | After ~1k Vercel image transforms on free plan |
| N+1 queries in activity feed (one query per post to load author) | Feed API response time >500ms | Use Drizzle `leftJoin` to load author data in the same query | Visible with >20 feed items |
| Realtime channels not unsubscribed on component unmount | Memory leak in long browser sessions; connection count inflated | Always call `channel.unbind_all()` and `pusher.unsubscribe()` in React `useEffect` cleanup | Noticeable after 30+ min sessions |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Image upload without file type validation (MIME + magic bytes) | Malicious file disguised as image; stored XSS via SVG | Validate magic bytes server-side with `file-type` npm package; reject SVG uploads; store as WebP only |
| No rate limiting on post creation / signup | Spam accounts, content flooding | `@upstash/ratelimit` on every write Server Action; stricter limits on signup and password reset |
| Volunteer mods can delete accounts or access private DMs | Mod abuse, privacy violation | Mod permissions: hide content, escalate to admin. Account deletion and DM access restricted to platform admins only |
| Crosspost OAuth tokens stored unencrypted | Token theft enables posting to users' Instagram accounts | Encrypt tokens at rest using `AES-256-GCM`; store key in Vercel environment secret |
| No CSRF protection on Server Actions | Cross-origin forged requests | Next.js App Router Server Actions include built-in CSRF origin check; do not disable it; verify it is active in Auth.js v5 |
| `x-tenant-id` header trusted without verification | Attacker sets arbitrary `x-tenant-id` header to access another tenant | The header is set by middleware and should only be trusted in Server Components. Verify that no external request can spoof this header — Vercel strips custom headers from external requests by default; document and test this behavior |

---

## "Looks Done But Isn't" Checklist

- [ ] **Account silo:** Composite `UNIQUE(tenant_id, email)` constraint exists in the migration — verify it with `\d users` in psql, not just by reading schema code
- [ ] **Canonical tags:** Load three different tenant domains in a browser; confirm each page's canonical URL matches its own host, not the first-deployed tenant
- [ ] **Password reset:** Test the reset flow from tenant B after creating the same email on tenant A — confirm the reset does not affect tenant A's password
- [ ] **Session isolation:** Authenticate on tenant A; navigate to tenant B in the same browser — confirm no authenticated session is present on tenant B
- [ ] **Sitemap:** Request `/sitemap.xml` from each tenant domain; confirm it contains only that tenant's URLs
- [ ] **hreflang:** Use Google's Rich Results Test on an article that has both EN and ES versions — confirm both `hreflang` tags and `x-default` are present and correct
- [ ] **CSAM scanning:** Upload a test image in a staging environment; confirm the CSAM scan completes and logs a result before the upload is committed
- [ ] **Tenant filter:** Write a test that seeds two tenants, then calls every read query helper as tenant A — assert zero rows from tenant B appear in any result
- [ ] **Image compression:** Upload a 15MB JPEG in staging; confirm what is stored in R2 is a WebP under 500KB
- [ ] **AI content noindex:** Publish an AI-drafted article without completing curation; confirm the page has `<meta name="robots" content="noindex">` in the HTML source

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cross-tenant data leak discovered in production | HIGH | Immediately rotate all sessions; audit affected queries; patch and redeploy; notify affected users per breach notification laws |
| Google Helpful Content penalty from thin AI content | HIGH | Remove or substantially rewrite affected articles; request Google reconsideration (no formal tool — improvement is the only path); recovery takes 3–6 months |
| Password reset cross-tenant leak | HIGH | Force password reset for all affected accounts on both tenants; patch the reset handler; send breach notification email |
| Pusher connection limit hit | MEDIUM | Upgrade Pusher plan (same-day); plan Ably migration in next sprint |
| Meta crosspost app review rejected | LOW | Revise app description per Meta feedback; resubmit; meantime disable crosspost UI with a feature flag |
| R2 storage cost spike from uncompressed uploads | MEDIUM | Run a batch Inngest job to recompress all existing originals; enable compression in the upload pipeline going forward |
| CSAM incident | CRITICAL | Immediately remove content; report to NCMEC via CyberTipline (legally required within 24 hours); preserve evidence per legal requirements; consult legal counsel |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Cross-tenant data leak (missing `tenant_id` filter) | Foundation / Data Layer | Integration test: two tenants, all queries, zero cross-tenant rows |
| Account silo broken (weak unique constraint) | Authentication | `UNIQUE(tenant_id, email)` in migration; password reset test across tenants |
| Session cookie bleed across domains | Authentication | E2E test: authenticate A, visit B, assert no session |
| Middleware doing too much | Foundation / Multi-Tenant Routing | No Drizzle/Node imports in `middleware.ts`; CI import check |
| Realtime connection limits | Realtime | Abstract `emitEvent()`; Pusher dashboard alert configured |
| AI content spam penalty | Content / SEO | `noindex` on all unpublished drafts; review queue enforced before publish |
| SEO canonicals / sitemap / hreflang wrong | Content / SEO | Per-tenant sitemap test; canonical URL check; hreflang validation tool |
| i18n hardcoded strings | Foundation | Lint rule or ESLint plugin blocking string literals in JSX; ES message file exists at project init |
| Media storage cost runaway | Media / Upload | `sharp` pipeline in upload handler; Vercel image transform alert |
| Moderation blind spots / CSAM | Moderation / Safety | CSAM service integrated before public beta; admin suspension tool exists |
| Meta API approval friction | Social Integration | App review submitted at sprint start; mock endpoint for dev |
| GDPR data export cross-tenant | Auth / Compliance | Export scoped to `(user_id, tenant_id)`; deletion cascade test |
| Over-engineering multi-tenant layer | Every phase | Sprint review gate: "does this feature affect the first vertical's users today?" |

---

## Sources

- 18 U.S.C. § 2258A (NCMEC CSAM reporting requirement) — HIGH confidence
- Google Search Central: Helpful Content System documentation — HIGH confidence
- Google Search Central: hreflang and canonical tag specifications — HIGH confidence
- Pusher pricing and connection limits (official Pusher docs) — MEDIUM confidence (verify current tier pricing)
- Meta Graph API developer docs: `instagram_content_publish`, app review requirements — MEDIUM confidence (Meta API policies change frequently; verify current requirements before implementation)
- Auth.js v5 docs: session configuration, cookie options — MEDIUM confidence (v5 was in beta at training cutoff; verify stable release notes)
- Vercel Edge Runtime constraints (no Node.js built-ins) — HIGH confidence
- Cloudflare R2 pricing (zero egress) — HIGH confidence
- Neon serverless driver requirements — HIGH confidence
- Multi-tenant SaaS data isolation patterns (general industry practice) — HIGH confidence

---
*Pitfalls research for: Multi-tenant niche social / community platform (Koral)*
*Researched: 2026-04-13*
