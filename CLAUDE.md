<!-- GSD:project-start source:PROJECT.md -->
## Project

**Koral**

Koral is a multi-domain social media platform that creates dedicated, branded social networks for niche interest communities (aquariums, fitness, concerts, anime, bullfighting, etc.). Each interest vertical lives at its own domain (e.g. `aquariumcommu.com`, `animecommu.com`) so users feel they're in an exclusive space built specifically for their hobby — built for passionate people who love their hobbies and want to share content, knowledge, and experiences.

**Core Value:** Make passionate hobbyists feel they have a *home* — a space that looks, sounds, and feels purpose-built for their community, not a generic forum or another subreddit lost in a sea of others.

### Constraints

- **Tech stack:** Next.js + Postgres, hosted on Vercel + managed Postgres (Neon/Supabase). Chosen for solo-dev velocity, SEO strength (SSR/ISR), and minimal ops.
- **Team:** Solo developer + Claude. Architectural choices must be maintainable by one person.
- **Multi-tenancy model:** Single app, single database, domain-based routing/theming. No per-vertical forks.
- **Account model:** Per-domain account silos (separate identity per vertical), even though the backend is shared.
- **i18n:** English and Spanish from v1. No machine translation as a substitute for native content.
- **Realtime:** Must support live chat + notifications + activity feed in v1. Choose infra that doesn't break the Vercel+Postgres serverless model (e.g. Pusher, Ably, Supabase Realtime, or a dedicated WS service).
- **SEO:** Article and Q&A pages must be server-rendered and indexable.
- **Monetization:** Ads-ready, not ads-live. Don't bake in ad SDKs in v1, but don't block them architecturally.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Executive Recommendation
## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Next.js** | `15.x` (App Router) | Framework, SSR/ISR/RSC, edge middleware, API routes | App Router gives per-route caching control essential for SEO-critical pages; RSC eliminates most client JS on content pages; middleware runs on the Edge runtime and is the natural place to resolve `host → tenant`. Partial Prerendering (PPR) lets you statically prerender article shells while streaming personalized regions (notifications, activity). |
| **React** | `19.x` | UI runtime | Required by Next.js 15; brings `useOptimistic`, Actions, and improved Suspense — all of which Server Actions lean on. |
| **TypeScript** | `5.6+` | Type safety | Non-negotiable for a solo dev. Drizzle and Auth.js v5 both ship strict types. |
| **PostgreSQL** | `16.x` (on Neon) | Primary datastore | Rich enough for FTS, JSONB for flexible content, partial indexes for soft-deletes, row-level tenant filtering. One DB, many tenants. |
| **Neon Postgres** | Current managed service | Serverless Postgres with branching | Scale-to-zero (cheap while you're pre-revenue), instant database branches for preview environments, HTTP driver (`@neondatabase/serverless`) that survives Vercel's serverless model without connection-pool pain. Supabase is the alternative but you don't need its auth/storage/realtime bundle — you'll pick best-of-breed instead. |
| **Drizzle ORM** | `0.36+` | SQL query builder + migrations | **Pick Drizzle over Prisma for this project.** Prisma's engine binary and cold-start cost on Vercel serverless is a known tax; Drizzle is a thin TS layer over `pg`/Neon HTTP, ships raw SQL when you want it, and its schema-as-code + `drizzle-kit` migrations are simple enough for a solo dev. FTS, CTEs, and window functions (you'll want all three for feeds) are first-class in Drizzle; awkward in Prisma. |
| **Auth.js (NextAuth v5)** | `5.x` (beta→stable) | Authentication | Works natively with App Router + Server Actions + middleware. Credentials + OAuth (Google, optionally Apple). Store sessions in the DB via Drizzle adapter. **Per-tenant silo pattern:** include `tenant_id` on the `users` table with a composite unique `(tenant_id, email)`; the `authorize` callback reads the tenant from the incoming host header (passed via a custom cookie or the `callbackUrl`) and scopes lookups. One user row per (tenant, email). Different tenants = different accounts by construction. |
| **Tailwind CSS** | `4.x` | Styling | v4's Oxide engine is dramatically faster and the new `@theme` directive makes per-tenant theming (CSS variables resolved in the root layout from tenant config) trivial. |
| **shadcn/ui** | latest | Component primitives | Copy-in components on Radix UI. You own the code, can re-theme per tenant, no runtime dependency lock-in. |
| **Pusher Channels** | Current SaaS | Realtime (chat, notifications, activity feed) | **This is the realtime pick for Vercel serverless.** Next.js on Vercel cannot hold long-lived WebSocket connections from server functions — you must offload to a hosted pub/sub. Pusher has the simplest DX, generous free tier (200k messages/day, 100 concurrent), presence channels, private auth endpoint pattern that maps cleanly to a Next.js route handler, and first-class React hooks. Ably is the stronger alternative if you outgrow Pusher's limits (better guarantees, global, higher free tier on messages but lower on connections). |
| **Cloudflare R2** | Current | Object storage for photos | **S3-compatible, zero egress fees** — critical for a photo-forward, SEO-indexed site where images are fetched constantly by crawlers and `next/image` optimizer. Pair with a CDN-served public bucket for originals and let `next/image` (on Vercel) handle on-the-fly resizing. UploadThing is tempting for DX but it's a thin wrapper with vendor lock-in and egress costs; Vercel Blob is fine but egress-priced and newer. |
| **`next/image`** | built-in | Image optimization | Vercel's image optimizer handles AVIF/WebP, responsive `srcset`, and LQIP. Configure `remotePatterns` to allow your R2 bucket. Budget the transform quota or use Cloudflare Images as a cheaper alternative once volume grows. |
| **next-intl** | `3.x` | i18n (EN/ES) | **Pick over `next-i18next`.** `next-i18next` is Pages Router era and awkward in App Router. `next-intl` has first-class App Router support, locale-prefixed routing (`/en/...`, `/es/...`), message formatting via ICU, typed messages, and works in RSC + Server Actions + middleware. The middleware composes cleanly with the tenant-resolution middleware. |
| **Tiptap** | `2.x` | Rich text editor for articles | **Pick over Lexical or Plate.** Tiptap is a ProseMirror wrapper with the best docs, strongest community extension set, straightforward HTML/JSON serialization (store JSON in Postgres, render HTML server-side for SEO), and a well-defined collab story if you later add Y.js. Lexical is Meta's and powerful, but docs are thinner and the ecosystem narrower. Plate is Slate-based — Slate has known SSR/hydration quirks and a rockier contributor graph. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@neondatabase/serverless` | latest | Postgres HTTP/WS driver | Use in all serverless routes. Works around connection-pool limits. |
| `drizzle-kit` | matches drizzle | Schema migrations | Dev-time only. Generates SQL migrations from schema changes. |
| `zod` | `3.23+` | Runtime validation | Validate all Server Action inputs, form data, tenant config, env vars. |
| `@t3-oss/env-nextjs` | latest | Typed env vars | Catch missing envs at build time, not in prod at 2am. |
| `pusher` + `pusher-js` | latest | Realtime server + client | Server SDK triggers events from Server Actions; client subscribes from RSC-wrapped client components. |
| `@auth/drizzle-adapter` | matches Auth.js | Auth.js → Drizzle bridge | Persist sessions/users/accounts into your Drizzle schema. |
| `react-hook-form` + `@hookform/resolvers` | latest | Forms | Pairs with Zod for client+server validation with Server Actions. |
| `lucide-react` | latest | Icon set | Tree-shakeable; default for shadcn/ui. |
| `date-fns` + `date-fns-tz` | `3.x` | Dates + locales | ES/EN locale support, smaller than Moment, no Intl pitfalls. |
| `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | `3.x` | R2 uploads | R2 is S3-API-compatible. Generate presigned PUT URLs from a Server Action; client uploads directly. |
| `sharp` | `0.33+` | Image processing | Only needed if you do upload-time processing outside `next/image` (EXIF strip, pHash for dedupe, blurhash generation). |
| `blurhash` / `thumbhash` | latest | LQIP placeholders | Generate at upload, store on the row, feed `next/image` `placeholder="blur"`. |
| **Inngest** | `3.x` | Background jobs, cron, event-driven workflows | **The serverless-native answer for queues.** No queue server to run. Durable functions, retries, step functions, cron, all triggered by events you emit from Server Actions. Alternative: Trigger.dev v3 (comparable). Do NOT run BullMQ/Redis — that's an ops burden you don't need. |
| `@upstash/redis` | latest | Rate limiting, ephemeral caches, feature-flag cache | HTTP-based Redis, scale-to-zero. Use `@upstash/ratelimit` to protect Server Actions (post-create, signup, chat send). |
| `@upstash/qstash` | latest | HTTP-based deferred jobs | Useful if Inngest is overkill for a specific fire-and-forget (e.g. "crosspost this to IG in 30s"). |
| **next-intl** middleware | bundled | Locale routing | Composed with tenant middleware. |
| `@vercel/flags` (Flags SDK) | latest | Feature flags | Free, native to Vercel, integrates with Edge Config for instant rollouts. Alternative: PostHog feature flags if you also want product analytics. |
| **Sentry** (`@sentry/nextjs`) | `8.x` | Error tracking | Essential. Catches both server and client errors; source-map upload is one-command. |
| **Axiom** (`next-axiom`) or **Vercel Observability** | latest | Logs + traces | Axiom has a generous free tier and excellent Next.js integration. Vercel's built-in observability (Log Drains, Web Analytics, Speed Insights) is the zero-config path. |
| **PostHog** | latest | Product analytics, session replay, feature flags | Self-hostable later if needed; cloud for now. |
| `@vercel/og` | built-in | OG image generation | Per-article, per-tenant-themed social share cards — huge for SEO/word-of-mouth. |
| `next-sitemap` or custom route | latest | Sitemaps | One sitemap per tenant host; critical for SEO. |
| `schema-dts` | latest | JSON-LD types | Type-safe structured data (`Article`, `QAPage`, `DiscussionForumPosting`) — Google rewards this for forum-type sites. |
### Search
- Generated `tsvector` column per searchable table (articles, threads, profiles)
- Separate column per language (`tsvector_en`, `tsvector_es`) using `english` / `spanish` dictionaries — **essential** for bilingual stemming quality
- Query the column matching the current locale
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| **pnpm** | Package manager | Faster, disk-efficient, stricter than npm. Vercel supports natively. |
| **Biome** (or ESLint + Prettier) | Lint + format | Biome is one tool, ~50x faster, zero config. If you need a specific ESLint plugin (e.g., `eslint-plugin-next`), stick with the ESLint + Prettier combo. |
| **Vitest** | Unit tests | Faster than Jest, native ESM, works with React Testing Library. |
| **Playwright** | E2E tests | Cross-browser, reliable, trace viewer is a superpower for debugging flakes. |
| **drizzle-kit studio** | DB GUI | Browse/edit schema + data locally. |
| **Vercel CLI** | Local dev, env pull, deploys | `vercel env pull` keeps `.env.local` in sync. |
| **Neon CLI** | Branch DBs per PR | Pair with Vercel preview deployments for real per-PR data isolation. |
## Installation
# Core
# Data layer
# Auth
# UI
# shadcn/ui via: pnpm dlx shadcn@latest init
# i18n
# Editor
# Realtime
# Storage
# Forms + validation
# Background jobs, rate limiting, flags
# Observability
# Structured data / SEO
# Utilities
# Dev tooling
## Multi-Tenant Routing Pattern (Vercel + Next.js 15)
- **Tenant registry** lives in Vercel Edge Config (instant reads, no DB hit in middleware) or a single-query cached lookup against Postgres. Edge Config is the right call: <10ms reads at the edge, updatable without redeploy.
- **Vercel Domains API** (or manual config) attaches each tenant domain to the single Vercel project. Wildcard DNS + on-demand domain registration via the Vercel API lets you onboard a new vertical without redeploying.
- Server components read the tenant via `headers().get('x-tenant-id')` — wrap this in a `getTenant()` helper and **never** query anything without it.
- **Drizzle query guard:** write a helper `tenantDb(tenantId)` that returns a Drizzle instance whose every query is auto-filtered by `tenant_id`. Enforce via a lint rule or code review — the only way to query the DB is through this helper.
- **Auth.js silo enforcement:** users table has `UNIQUE (tenant_id, email)`. The sign-in flow reads `x-tenant-id` from the request and scopes the lookup. OAuth callback URLs are tenant-specific (`/api/auth/callback/google` on each host). Sessions include `tenantId` in the JWT so every API call is self-verifying.
- **Theme per tenant:** tenant config stores color tokens; root layout emits `<style>` with CSS custom properties; Tailwind v4 `@theme` reads them. Dynamic theming without any runtime JS.
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Drizzle** | Prisma | If you already know Prisma cold and cold-start tax is acceptable; or if you want Prisma Accelerate's managed connection pool. Still, not for this project. |
| **Neon** | Supabase | If you want one vendor for DB + auth + storage + realtime. But you lose best-of-breed (Auth.js multi-tenant flexibility, R2 pricing, Pusher DX). Supabase Realtime works on Vercel but its auth model is harder to retrofit to per-tenant silos. |
| **Neon** | Vercel Postgres | Vercel Postgres *is* Neon under the hood. Using Neon directly gives you branching and better pricing. |
| **Auth.js v5** | Clerk | If you want a polished pre-built UI, MFA, user management dashboard, and you're willing to pay per MAU. Clerk's multi-tenancy ("Organizations") is org-membership, not domain-silo — you'd fight the model. Skip. |
| **Auth.js v5** | Lucia | Lucia (v3) is lower-level, more code to own. Good if Auth.js bugs frustrate you, but more DIY. Note: Lucia's maintainer announced deprecation/handoff in 2024 — check status before adoption. |
| **Pusher** | Ably | Better message throughput and global regions. Pick if you hit Pusher's connection/message limits. DX is slightly more complex. |
| **Pusher** | Supabase Realtime | Viable if you adopt Supabase for DB. Works via Postgres replication → WS broadcast. Ties realtime coupling to your DB provider. |
| **Pusher** | PartyKit | Great DX, Cloudflare Durable Objects under the hood, ideal for ephemeral room state (chat, presence). Evaluate in v2 when chat patterns stabilize. |
| **Pusher** | Soketi (self-hosted) | Pusher-protocol-compatible OSS. Only if cost becomes a problem and you accept ops. Not day-one. |
| **Cloudflare R2** | Vercel Blob | Zero-config, pay-per-GB + egress. Fine for low volume. R2 wins once you have real image traffic. |
| **Cloudflare R2** | UploadThing | Best DX of all, but vendor lock-in and egress pricing. Good for MVP demos, bad for photo-forward production. |
| **Cloudflare R2** | AWS S3 | S3 egress will bleed you on a photo site. R2 is the sane default in 2026. |
| **Postgres FTS** | Meilisearch | Once you need typo tolerance, facets, or instant-search DX. Easy to adopt incrementally — index from a DB trigger or Inngest job. |
| **Postgres FTS** | Typesense | Equivalent to Meilisearch in capability; Meilisearch has slightly better i18n stemming and a larger community. |
| **Postgres FTS** | Algolia | Only if someone else is paying. Pricing model is hostile to UGC. |
| **next-intl** | next-i18next | Don't. It's Pages Router era. |
| **next-intl** | Lingui, Paraglide | Paraglide (inlang) is interesting for tree-shaken messages; evaluate if bundle size becomes critical. Lingui is fine but smaller Next.js ecosystem. |
| **Tiptap** | Lexical | If you want Meta-backed and are comfortable with sparser docs. Collab story is strong. |
| **Tiptap** | Plate | If you're already invested in Slate. Hydration quirks in SSR are the cost. |
| **Tiptap** | BlockNote | Notion-style block editor on top of Tiptap — consider if your article UX leans block-based. It's a superset, not a replacement. |
| **Inngest** | Trigger.dev v3 | Comparable. Trigger has better CLI dev UX; Inngest has cleaner event-first model. Either works. |
| **Inngest** | QStash only | If all you need is delayed HTTP calls, QStash is simpler. Inngest is worth it for workflows. |
| **Inngest** | BullMQ/Redis | Requires a worker process — incompatible with pure serverless. Do not use. |
| **Vercel Flags SDK** | PostHog flags | If you already run PostHog for analytics, consolidate. |
| **Axiom + Sentry** | Datadog, New Relic | Enterprise pricing. Overkill. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Prisma (on Vercel serverless for this project)** | Query engine binary, cold starts, awkward raw SQL, migration pain at scale | Drizzle |
| **Pages Router** | App Router is the 2025+ standard; PPR, Server Actions, streaming all require it | Next.js App Router |
| **next-i18next** | Pages Router era, clunky in App Router | next-intl |
| **Clerk for domain-silo multi-tenancy** | Its model is orgs-within-an-app, not separate-silos-per-host. You'll fight it. | Auth.js v5 with a `tenant_id` scoped users table |
| **BullMQ / Redis workers** | Requires a long-lived worker process; incompatible with Vercel's serverless model | Inngest or Trigger.dev |
| **Running your own WebSocket server from Next.js API routes** | Serverless functions on Vercel cannot hold connections; they time out and bill | Pusher / Ably / PartyKit |
| **AWS S3 (egress)** | Egress costs on a photo site will eat your budget | Cloudflare R2 |
| **Algolia (from day one)** | Pricing model punishes UGC growth | Postgres FTS → Meilisearch later |
| **Moment.js** | Deprecated, huge bundle | date-fns |
| **Lodash (whole)** | Bundle bloat | ES built-ins or per-function imports |
| **styled-components / emotion (runtime CSS-in-JS)** | RSC-incompatible (client-only), kills streaming | Tailwind + CSS variables |
| **Redux / Zustand for server state** | Server state belongs in RSC + Server Actions | React Query only if you truly need client caching; otherwise RSC |
| **Vercel Blob (at photo-scale volumes)** | Egress pricing will hurt once traffic grows | R2 |
| **Supabase Auth for domain-silo model** | Built around a single `auth.users` table per project; silo-per-host requires uncomfortable workarounds | Auth.js v5 |
| **Machine-translated content surfaces as "Spanish support"** | SEO-hostile, user-hostile | Native ES content + `next-intl` for UI chrome |
| **Elasticsearch / OpenSearch** | Ops burden unsustainable for solo dev | Postgres FTS, then Meilisearch |
| **Self-hosted Postgres (RDS, DIY)** | You're one person | Neon (managed, branching, scale-to-zero) |
## Stack Patterns by Variant
- Move `next/image` optimization off Vercel and onto **Cloudflare Images** or a self-hosted `imgproxy`.
- Keep originals on R2; serve optimized via CDN.
- Because: Vercel image optimization has per-seat transform quotas; Cloudflare is cheaper at volume.
- Migrate to **Ably** (better message-per-$ at scale) or **PartyKit** (Cloudflare Durable Objects — great for chat rooms).
- Keep the event shape abstract so the swap is mechanical.
- Because: Pusher's connection-count pricing compounds with growth; chat + presence + activity on one product can easily hit 5k concurrent.
- Stand up **Meilisearch Cloud**, index via an Inngest function triggered by `post.created` / `article.published` events.
- Keep FTS as a fallback until Meilisearch index is warm.
- Because: FTS is fine for <50k indexable docs per tenant; beyond that, typo tolerance and relevance tuning are worth the jump.
- Replace Auth.js with **WorkOS** or **Clerk Orgs**.
- Preserve the `tenant_id` column; wire the new IDP to populate it.
- Because: Solo-dev enterprise auth is a tarpit; outsource when there's revenue to justify it.
- Use **Inngest step functions** to chain retrieval → draft → critique → human-review → publish.
- Store artifacts at each step in Postgres.
- Because: Durable, resumable, observable — and free until you scale.
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@15` | `react@19`, `react-dom@19` | React 19 is required. |
| `next@15` | `next-intl@3.x` | App Router support is in 3.x line. |
| `next-auth@5.x` | `@auth/drizzle-adapter` matching major | v4 and v5 adapters are not interchangeable. |
| `drizzle-orm` | `@neondatabase/serverless` | Use the `drizzle-orm/neon-http` driver for serverless routes. |
| `tailwindcss@4` | `@tailwindcss/postcss` or Vite plugin | PostCSS plugin is the default for Next.js. |
| `@tiptap/react@2` | React 18 / 19 | Works under React 19; double-check extensions you pull in. |
| `tsconfig` `moduleResolution` | `Bundler` | Required for Next.js 15 path resolution and modern package exports. |
| Vercel Edge runtime | No Node APIs in middleware | Keep tenant-resolution middleware lean: no Drizzle, no Node crypto — read Edge Config only. |
| Node.js runtime | `>=20` on Vercel | Neon serverless driver and Auth.js v5 both need Node 20+. |
## Sources
- Next.js official docs (App Router, middleware, Image, i18n routing) — HIGH confidence on architectural patterns
- Drizzle ORM docs + community consensus on Vercel serverless performance — HIGH confidence on DX tradeoffs vs Prisma
- Auth.js v5 migration docs + multi-tenant patterns from community threads — MEDIUM confidence; verify v5 has reached stable before locking
- Neon docs (branching, serverless driver) — HIGH confidence
- Pusher docs + Vercel serverless compatibility guidance — HIGH confidence on the pattern, MEDIUM on current pricing
- Cloudflare R2 pricing page (zero egress) — HIGH confidence
- next-intl docs (App Router middleware) — HIGH confidence
- Tiptap docs + ecosystem comparison — HIGH confidence
- Inngest docs (Vercel integration, step functions) — HIGH confidence
- Vercel Edge Config docs (multi-tenant patterns) — HIGH confidence
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
