# Architecture Research

**Domain:** Multi-tenant niche social platform (Next.js + Postgres + Vercel)
**Researched:** 2026-04-13
**Confidence:** MEDIUM-HIGH (patterns well-established; specific vendor details should be re-verified at implementation time since WebSearch was unavailable during research)

> **Research note:** WebSearch was denied during this session. Findings draw on Next.js 14/15 patterns, Vercel Platforms Starter Kit conventions, and widely-documented Postgres multi-tenancy patterns as of Claude's May 2025 training cutoff. Vendor-specific pricing and feature claims (Pusher/Ably/Supabase Realtime/Inngest) should be re-verified at implementation time.

---

## System Overview

```
                         ┌──────────────────────────────┐
                         │   Users on *.com domains     │
                         │ aquariumcommu / animecommu   │
                         └──────────────┬───────────────┘
                                        │ HTTPS
                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                         EDGE LAYER (Vercel)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ middleware.ts                                             │   │
│  │   1. Read Host header → resolve tenant slug              │   │
│  │   2. Detect locale (path / Accept-Language / cookie)     │   │
│  │   3. Rewrite URL to /[tenant]/[locale]/...               │   │
│  │   4. Inject x-tenant-id + x-locale request headers       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────┬──────────────────────────────────────────────────┘
               │ rewritten request
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APP LAYER (Next.js App Router)                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │  RSC pages │  │Server      │  │ Route      │  │ Realtime  │  │
│  │  (SEO)     │  │Actions     │  │ Handlers   │  │ broker    │  │
│  │  ISR/SSR   │  │(mutations) │  │ (webhooks) │  │ callouts  │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬─────┘  │
│        │               │               │               │         │
│        ▼               ▼               ▼               ▼         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Tenant Context (resolved from headers, RLS session var)  │   │
│  └──────────────────────────────────────────────────────────┘   │
│        │               │               │               │         │
│        ▼               ▼               ▼               ▼         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Domain services (auth, feed, chat,            │   │
│  │            content, moderation, search, media)           │   │
│  └──────────────────────────────────────────────────────────┘   │
└────┬────────┬───────────┬───────────┬──────────┬───────────┬────┘
     │        │           │           │          │           │
     ▼        ▼           ▼           ▼          ▼           ▼
┌────────┐ ┌──────┐  ┌─────────┐ ┌────────┐ ┌──────┐  ┌──────────┐
│Postgres│ │Redis │  │Realtime │ │ Object │ │Search│  │Job queue │
│(Neon)  │ │Upstash│ │ broker  │ │storage │ │Meili/│  │ Inngest  │
│ +RLS   │ │cache │  │(Pusher/ │ │(Vercel │ │Typesns│ │/QStash   │
│tenant  │ │rate- │  │ Ably)   │ │ Blob / │ │      │  │          │
│_id col │ │limit │  │         │ │  R2)   │ │      │  │          │
└────────┘ └──────┘  └─────────┘ └────────┘ └──────┘  └──────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Edge middleware | Host→tenant resolution, locale detection, URL rewrite, header injection | `middleware.ts` with in-memory tenant map, falls back to KV on cache miss |
| Tenant registry | Authoritative domain→tenant_id mapping, per-tenant config (theme, features, default locale) | `tenants` table in Postgres + edge KV mirror (Vercel Edge Config or Upstash) |
| App Router pages | SEO-critical server rendering of articles, threads, Q&A, feeds | RSC + ISR with `revalidateTag('tenant:X:feed')` |
| Server Actions | Mutations: post, react, follow, moderate. Run on Node runtime (not edge) because they touch Postgres+auth | `"use server"` functions imported by client components |
| Auth | Per-tenant user silo; session tied to (tenant_id, user_id) | Auth.js/NextAuth or Lucia, custom adapter scoping by tenant |
| Domain services | Feed, content, chat, notifications, search indexing, moderation, media | Plain TS modules under `src/server/` — no microservices |
| Realtime broker | Hold persistent WS connections; serverless app publishes via REST | **Pusher Channels or Ably** (hosted); Supabase Realtime if using Supabase |
| Media pipeline | Direct-to-storage upload, async optimization, CDN serve | Vercel Blob or Cloudflare R2 + `next/image` loader |
| Search | Full-text + facets for articles, Q&A, threads, tag pages | Meilisearch Cloud or Typesense Cloud, synced via outbox |
| Background jobs | Cron, fan-out, AI drafting, search indexing, email/push, crosspost | **Inngest** (event-driven, Vercel-native) |
| Cache/rate limit | Session cache, feed fragments, rate limiting | Upstash Redis |

---

## The Twelve Questions — Explicit Answers

### 1. Tenant resolution (domain → tenant)

**Recommendation:** Edge middleware + Edge Config (or in-process JSON) fallback to DB on cache miss.

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host')!.replace(/:\d+$/, '');
  // Strip www, handle localhost for dev
  const normalized = host.replace(/^www\./, '');

  // Edge Config is a KV blob replicated to every edge region; sub-ms reads
  const tenants = (await get<Record<string, Tenant>>('tenants')) ?? {};
  const tenant = tenants[normalized];
  if (!tenant) return new NextResponse('Unknown tenant', { status: 404 });

  // Locale detection
  const url = req.nextUrl.clone();
  const firstSeg = url.pathname.split('/')[1];
  const locale = ['en', 'es'].includes(firstSeg)
    ? firstSeg
    : (req.cookies.get('locale')?.value ?? tenant.defaultLocale);

  // Rewrite: /articles/xyz → /_tenants/aquarium/en/articles/xyz
  // (internal; user URL stays clean)
  if (!['en', 'es'].includes(firstSeg)) {
    url.pathname = `/${locale}${url.pathname}`;
  }
  url.pathname = `/_tenants/${tenant.slug}${url.pathname}`;

  const res = NextResponse.rewrite(url);
  res.headers.set('x-tenant-id', tenant.id);
  res.headers.set('x-tenant-slug', tenant.slug);
  res.headers.set('x-locale', locale);
  return res;
}

export const config = {
  matcher: ['/((?!_next|_static|favicon.ico|robots.txt|sitemap.xml).*)'],
};
```

**Why Edge Config:** Sub-millisecond reads at edge, no cold-start DB query, updated by admin UI pushing to Edge Config API. The tenant registry is tiny (a few to a few hundred domains) so it fits easily.

**Tenant context in app code:** Read headers via `headers()` helper in RSC/Server Actions. Do not trust client-sent tenant IDs — always derive from middleware-injected header.

### 2. Data model: shared schema vs schema-per-tenant vs RLS

**Recommendation: Shared schema + `tenant_id` column on every tenant-scoped table + Postgres RLS as a safety net.**

Tradeoffs:

| Strategy | Pros | Cons | Verdict |
|----------|------|------|---------|
| Schema-per-tenant | Hard isolation, easy per-tenant backup | Migration pain at N tenants, connection-pooling friction, schema explosion | **NO** — solo dev can't manage N schemas |
| Separate DBs per tenant | Strongest isolation | Wildly expensive, connection limits on serverless, kills solo dev | **NO** |
| Shared schema + `tenant_id` col, app-level filtering only | Simple, cheap, one migration | App bugs can leak data cross-tenant | **Base layer** |
| **Shared schema + `tenant_id` + RLS** | Same as above + DB-enforced isolation as last line of defense | Slight complexity: set session var per request | **RECOMMENDED** |

**Implementation:**

```sql
-- Every tenant-scoped table has tenant_id NOT NULL
CREATE TABLE posts (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  author_id uuid NOT NULL,
  -- ...
);
CREATE INDEX ON posts (tenant_id, created_at DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON posts
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

```typescript
// db/client.ts — wrap every query with tenant context
export async function withTenant<T>(tenantId: string, fn: (tx) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx);
  });
}
```

**Note on Neon/Supabase:** Both support RLS. With Neon + a pooled connection (pgbouncer transaction mode), use `SET LOCAL` inside a transaction so the setting doesn't leak between pooled connections. Drizzle and Prisma both support wrapping transactions like this.

**Index every query by `(tenant_id, ...)` as leading column.** This is the #1 perf rule for shared-schema multi-tenant.

### 3. Per-tenant account silos when the `users` table is shared

**Recommendation:** Compound unique `(tenant_id, email)` — same email can register once per tenant, each registration is a distinct user row.

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  email citext NOT NULL,          -- citext = case-insensitive
  email_verified_at timestamptz,
  password_hash text,
  display_name text NOT NULL,
  -- ...
  UNIQUE (tenant_id, email)
);
```

**Implications:**
- Signup/login forms always operate in tenant context from middleware header — never ask "which site?".
- Password reset tokens scoped by tenant_id so a token from aquariumcommu can't unlock an animecommu account with the same email.
- Sessions: include `tenant_id` in the session record; on every request, assert `session.tenant_id === request.tenant_id`, otherwise force re-login.
- OAuth: provider sub mapped per-tenant — table `user_identities (tenant_id, provider, provider_sub, user_id)` with unique `(tenant_id, provider, provider_sub)`. Same Google account can link to separate Koral identities on different verticals.
- Profile slugs unique per tenant: `UNIQUE (tenant_id, username)`.
- Tracking: never show "user also posts on animecommu" — silo is a product promise, not just a DB choice.

### 4. Theming / branding per tenant

**Recommendation:** Config table in Postgres, mirrored into Edge Config for edge reads, CSS custom properties at runtime (not build time).

```typescript
// tenants table columns
interface TenantTheme {
  colors: { primary: string; accent: string; bg: string; fg: string };
  logoUrl: string;
  faviconUrl: string;
  fontPair: { heading: string; body: string }; // Google Font family names
  heroImageUrl: string;
}
```

**Applied via:**
- Root layout injects `<style>:root { --color-primary: {theme.primary}; ... }</style>` from tenant config
- Tailwind uses `var(--color-primary)` everywhere: `bg-[var(--color-primary)]` or a small plugin
- Logo/favicon/font-links rendered dynamically in `<head>` per tenant
- Hero/OG images point at tenant asset URLs

**Why not file-based per slug?** File-based (e.g. `themes/aquarium.ts`) means adding a vertical requires a code deploy. DB-backed means an admin page can launch a new vertical without code. Cost is minimal since the theme is tiny and cached at edge.

**For layout/component variations** (rare but possible), use feature flags in tenant config (`features: { showQA: true, showMarketplace: false }`) rather than separate component trees.

### 5. i18n routing (EN/ES)

**Recommendation:** Path-based locale (`/en/...`, `/es/...`) with middleware fallback chain, `hreflang` tags, and tenant-level default locale.

Reasoning:
- **Path-based** is the only option that gives distinct indexable URLs per locale without separate domains. SEO-critical.
- **Domain-based** (`es.aquariumcommu.com`) conflicts with the multi-tenant domain strategy (Koral's domains already encode the vertical).
- **Cookie-only** is an SEO disaster — same URL serves different content, Google hates it.

**Locale resolution order in middleware:**
1. URL path prefix (`/en/...` or `/es/...`) — highest priority, wins over everything
2. `locale` cookie (set when user explicitly switches)
3. `Accept-Language` header
4. Tenant's `default_locale` (e.g., `es` for Spanish-first verticals)

**Content model:** Articles store a `locale` column and a `translation_group_id` so an article can have EN and ES versions linked. URLs: `/en/articles/aquarium-basics` and `/es/articulos/fundamentos-acuario`. `<link rel="alternate" hreflang="...">` tags emitted from `generateMetadata`.

**Don't** machine-translate UGC (threads, comments) — it's false promise and tanks quality. Do translate UI strings via `next-intl` (recommended over `next-i18next` on App Router).

### 6. Realtime on serverless

**The core problem:** Vercel functions are stateless and short-lived. You cannot hold WebSocket connections in a Next.js handler.

**Options (confidence MEDIUM on pricing, HIGH on architecture):**

| Option | How it works | Pros | Cons |
|--------|--------------|------|------|
| **Pusher Channels** | Hosted WS broker. App publishes via REST, clients subscribe | Mature, simple SDK, dead-reliable, presence built-in | Per-message pricing can get expensive at scale |
| **Ably** | Similar to Pusher, more enterprise features | Global edge, history, rewind, idempotent publishes | Steeper learning curve, pricier |
| **Supabase Realtime** | Phoenix-based, listens on Postgres replication | Free-tier friendly if you already use Supabase, DB changes auto-broadcast | Couples you to Supabase; row-level channel semantics get awkward across tenants |
| **Partykit / Cloudflare Durable Objects** | Your own WS server on CF Workers | Cheap, flexible, edge-native | More code to maintain, less batteries-included |
| **Self-hosted Soketi** | Pusher-protocol-compatible OSS WS server | Cheap if traffic is predictable | You now run a server — defeats Vercel-only ops model |

**Recommendation: Pusher Channels for v1, with architecture that allows swap later.**

Rationale:
- Zero ops, matches solo-dev constraint
- Vercel has no WS runtime, so "stay on Vercel" forces a hosted broker
- Pusher's presence channels give you online indicators if you want them later (even though v1 defers presence)
- Cost is predictable until you hit real scale, and migration to Ably or Partykit later is bounded (client SDK swap + publish call swap)

**Architecture:**

```
[Client] ←── WSS ──→ [Pusher broker]
                          ▲
                          │ REST publish (with HMAC auth)
                          │
[Server Action / Route Handler on Vercel]
    ↓ write to Postgres
    ↓ publish event to Pusher channel: tenant-{id}-user-{id} or tenant-{id}-room-{roomId}
```

**Channel naming rule:** Always prefix channels with tenant ID. Private channels signed with tenant+user auth so a client cannot subscribe to another tenant's events even if they guess the name.

**Event types:**
- `tenant-{t}-user-{u}-private`: notifications, DM delivery
- `tenant-{t}-room-{r}-presence`: chat room messages (v1 uses private, not presence)
- `tenant-{t}-feed-{u}-private`: feed updates (optional — may poll instead in v1)

**Persistence is Postgres, not the broker.** The broker is a pipe, not a store. Every message written to DB first, then published. On reconnect, client fetches "since cursor" via REST to backfill.

### 7. Media pipeline

**Recommendation:** Direct-to-storage uploads with presigned URLs → async image processing → serve via CDN.

**Flow:**
```
[Client photo] → [/api/upload-url] → presigned URL → [PUT to blob storage]
                                                             │
                                                             ▼
                                             [Webhook or job fires]
                                                             │
                                                             ▼
                                   [Inngest job: probe, thumbnail, EXIF strip,
                                    blurhash, NSFW scan, store metadata row]
                                                             │
                                                             ▼
                                           [posts.media_id filled in]
                                                             │
                                                             ▼
                  [next/image loader serves optimized variants from CDN]
```

**Storage choice:**
- **Vercel Blob** — simplest, integrates with Next.js, fine for v1
- **Cloudflare R2** — cheaper egress, S3-compatible, better at scale
- Pick Vercel Blob for v1 to minimize accounts; migrate to R2 if/when egress bites.

**Image optimization:** Use `next/image` with a custom loader pointing at your CDN. Do NOT run Vercel Image Optimization on every uncached request — it counts toward Vercel's image transform budget and is expensive. Instead, pre-generate a small set of variants (e.g., 400w / 800w / 1600w / original) in the Inngest job and serve those directly from the CDN.

**Safety:** NSFW scan on upload (Sightengine or a local model via an Inngest job). Strip EXIF GPS. Rate-limit uploads per user per tenant.

**Tenant scoping:** Object keys include tenant slug: `tenants/aquarium/posts/{uuid}/original.jpg`. Enables per-tenant cleanup, analytics, and future migration to per-tenant buckets if needed.

### 8. Search indexing

**Recommendation:** Outbox pattern + Inngest worker → Meilisearch (or Typesense) Cloud.

**Why not Postgres full-text only?** It works, but for a social platform with faceted search (tags, locale, tenant, content type), FTS is painful to tune and doesn't give typo tolerance. Meilisearch is dead simple and its cloud free tier covers launch.

**Why not triggers calling HTTP?** Postgres triggers firing HTTP calls is fragile (no retries, blocks writes). Triggers calling out are a smell.

**Why not sync directly from the Server Action?** Works for single-record writes but loses batching, retries, and creates a failure mode where a Meili outage rolls back the user's post.

**Outbox pattern:**
```sql
CREATE TABLE search_outbox (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  entity_type text NOT NULL,     -- 'post', 'article', 'thread', 'user'
  entity_id uuid NOT NULL,
  op text NOT NULL,              -- 'upsert' | 'delete'
  payload jsonb,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX ON search_outbox (processed_at) WHERE processed_at IS NULL;
```

- Every mutating Server Action writes to domain table + outbox row in the **same transaction** (guaranteed consistent).
- Inngest scheduled function polls outbox every N seconds, batches rows, pushes to Meili, marks processed.
- Indexes are per-tenant by convention: index name `posts_tenant_{slug}` or a single index with `tenant_id` as a filterable attribute. Single-index-with-filter is simpler; per-tenant-index is cleaner isolation. **Recommend single index with `tenant_id` as filter attribute** — the query always adds `filter: "tenant_id = X"`. Less index management, same logical isolation.

### 9. Background jobs

**Recommendation: Inngest.**

| Option | Verdict |
|--------|---------|
| **Inngest** | Event-driven, step functions, retries, cron, fan-out. Vercel-native deploy. Best fit. |
| Trigger.dev | Similar capabilities, also strong. Either works; Inngest is slightly more serverless-native. |
| QStash (Upstash) | Simpler HTTP queue + cron. Fine for simple fire-and-forget, lacks step functions and complex workflows. Use as fallback if Inngest proves expensive. |
| Vercel Cron | Only cron, no queueing. Use for tiny schedules (e.g., "nightly cleanup") but not for job workflows. |

**Jobs needed:**
- `media.process` — thumbnails, blurhash, NSFW (per-upload event)
- `search.flush` — drain search_outbox every 5s
- `feed.fanout` — optional: push new posts to follower feeds (v1 can pull-model to defer this)
- `notifications.send` — deliver email/push/in-app
- `ai.draft_article` — AI-drafted founding content pipeline
- `crosspost.publish` — IG/WA outbound
- `moderation.scan` — run classifiers on new UGC
- `digest.daily` — daily email roundup (cron)
- `cleanup.daily` — soft-delete GC, token expiry (cron)

**Pattern:** Server Actions emit events (`inngest.send({ name: 'post.created', data: { tenantId, postId } })`); Inngest functions handle them. Keeps Server Actions fast.

### 10. Caching and revalidation

**Layered approach:**

| Layer | What it caches | Invalidation |
|-------|----------------|--------------|
| Edge CDN (Vercel) | Static assets, `next/image` variants | Automatic |
| `unstable_cache` / `fetch` cache | RSC data reads tagged by tenant + entity | `revalidateTag()` from Server Actions |
| ISR on SEO pages | Article/Q&A/thread pages | `revalidatePath()` on edit, `revalidateTag('tenant:X:articles')` on bulk ops |
| Upstash Redis | Session lookups, feed fragments, rate limit counters | TTL-based |

**Tag-based revalidation pattern:**
```typescript
// Reads
const article = await unstable_cache(
  () => db.select().from(articles).where(...),
  ['article', articleId],
  { tags: [`tenant:${tenantId}`, `article:${articleId}`] }
)();

// Writes (Server Action)
await db.update(articles)...;
revalidateTag(`article:${articleId}`);
```

**Critical tenant isolation rule:** Always include tenant_id in cache tags AND cache keys. Never cache something fetched under tenant A's context and serve it to tenant B. Cache keys should look like `article:{tenantId}:{articleId}`.

**SEO pages:** Articles and Q&A use ISR with long revalidation windows (e.g. 1 hour) + on-demand revalidate when content changes. Thread pages can be shorter (e.g. 60s) since they change frequently.

**Feed pages:** Authenticated, personalized → no CDN cache. Cache at app level in Redis per `(tenantId, userId, cursor)` with short TTL.

### 11. Component / data flow boundaries

**Layer rules (enforced by folder structure + lint):**

```
src/
├── app/                        # Next.js App Router
│   ├── (marketing)/            # public marketing routes
│   ├── (app)/                  # authenticated app shell
│   │   ├── [locale]/
│   │   │   ├── feed/
│   │   │   ├── articles/[slug]/
│   │   │   ├── q/[slug]/
│   │   │   ├── threads/[slug]/
│   │   │   └── u/[username]/
│   ├── api/                    # Route handlers: webhooks, upload URLs, Pusher auth, Inngest endpoint
│   └── layout.tsx              # theme injection from tenant config
├── server/                     # server-only code
│   ├── db/                     # Drizzle schema + withTenant helper
│   ├── auth/                   # NextAuth/Lucia config
│   ├── tenant/                 # tenant resolution, Edge Config sync
│   ├── content/                # articles, threads, Q&A services
│   ├── feed/                   # feed builder
│   ├── chat/                   # chat rooms, DMs (persist to DB, publish to Pusher)
│   ├── notifications/          # notification services
│   ├── media/                  # upload URL signing, media metadata
│   ├── search/                 # Meili client, outbox drainer
│   ├── moderation/             # reports, mod queue, classifiers
│   ├── jobs/                   # Inngest function definitions
│   └── i18n/                   # next-intl config, message catalogs
├── components/                 # shared UI (RSC + client)
│   ├── ui/                     # design system primitives
│   ├── content/                # article, thread, Q&A renderers
│   ├── chat/                   # chat UI (client components, uses Pusher client)
│   └── feed/                   # feed UI
├── lib/                        # isomorphic utils
│   ├── tenant-context.ts       # headers() → tenant accessor
│   ├── pusher-client.ts
│   └── i18n.ts
├── middleware.ts               # tenant + locale resolution
└── styles/
```

**Boundary rules:**
- `components/` never imports from `server/` (enforce with eslint-plugin-boundaries)
- `server/` never imports from `app/` or `components/` — it's a pure service layer
- Every `server/` function that touches the DB goes through `withTenant(tenantId, ...)` — no exceptions
- Client components never receive raw DB rows; always pass DTOs scoped by the RSC

**Data flow (writes):**
```
Client form → Server Action → validate (Zod) → withTenant(tx):
                                                  ├── domain write
                                                  ├── outbox row
                                                  └── audit log
                                              → revalidateTag
                                              → inngest.send(event)
                                              → publish to Pusher (if realtime)
                                              → return result
```

**Data flow (reads, SEO page):**
```
Request → middleware rewrite → RSC page → unstable_cache(tenant-tagged)
                                       → withTenant (RLS enforced)
                                       → Drizzle query
                                       → render HTML
                                       → ISR cache at edge
```

**Data flow (realtime):**
```
Other user posts → Server Action writes row → Inngest 'post.created' event
                                            → fanout function
                                            → Pusher publish on tenant-{t}-user-{u}-private
                                            → client SDK receives → UI updates
```

---

## Recommended Project Structure

(See "Component / data flow boundaries" above for full tree.)

### Structure Rationale

- **`app/[locale]/...`** — path-based locale is the SEO sweet spot; middleware rewrites internally but the user-visible URL stays clean
- **`server/` as the single place for data access** — lets the solo dev reason about tenant scoping in one layer
- **Group by feature, not by type** — `server/chat/` holds chat-service, chat-repo, chat-types together; easier for solo dev to keep mental model
- **`middleware.ts` at root is mandatory** — tenant resolution must happen before any request hits a page

---

## Architectural Patterns

### Pattern 1: Tenant-Scoped Repository

**What:** Every DB access goes through a helper that sets the RLS session variable.
**When to use:** Always. No direct DB calls from app code.
**Trade-offs:** Slight boilerplate, but makes tenant leakage nearly impossible. Worth it.

```typescript
// server/content/articles.repo.ts
export async function getArticleBySlug(tenantId: string, slug: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.articles.findFirst({ where: eq(articles.slug, slug) })
  );
  // RLS enforces tenant_id filter automatically
}
```

### Pattern 2: Outbox for Cross-System Consistency

**What:** Any write that must propagate to external systems (search, realtime, email) writes a row in the same transaction, and a worker drains it.
**When to use:** Search indexing, email queue, crosspost triggers, anywhere "must eventually happen but not synchronously."
**Trade-offs:** Requires a worker; avoids distributed-transaction nightmares and silent data drift.

### Pattern 3: Presigned Direct Upload

**What:** Client uploads directly to blob storage via presigned URL; server never proxies bytes.
**When to use:** All media uploads.
**Trade-offs:** Slightly more client-side code; keeps Vercel functions fast and cheap.

### Pattern 4: Edge Config as Tenant Cache

**What:** Tenant registry lives in Postgres (source of truth) and mirrors to Vercel Edge Config for middleware reads.
**When to use:** Any data read in edge middleware that changes rarely.
**Trade-offs:** Need a small sync job (admin-triggered or Inngest on tenant write); massively faster than DB query at edge.

### Pattern 5: Channel Naming by Tenant

**What:** Every Pusher channel name starts with `tenant-{id}-`. Auth endpoint verifies user belongs to that tenant before signing.
**When to use:** Always.
**Trade-offs:** None. Critical for silo enforcement.

### Pattern 6: RSC for SEO, Client Components for Interactivity

**What:** Article/thread/Q&A pages render as Server Components for crawlability; chat/feed interactions hydrate as client components.
**When to use:** Default to RSC; opt into client only where needed.
**Trade-offs:** Mental split between server and client boundaries; App Router is designed for this.

---

## Data Flow

### Request Flow (SEO page)

```
Browser request (aquariumcommu.com/en/articles/nitrogen-cycle)
    ↓
middleware.ts  → host→tenant lookup (Edge Config)
               → locale detection
               → rewrite to /_tenants/aquarium/en/articles/nitrogen-cycle
               → inject x-tenant-id header
    ↓
RSC page (app/_tenants/[slug]/[locale]/articles/[slug]/page.tsx)
    ↓
generateMetadata() → tenant-aware OG tags, hreflang
    ↓
unstable_cache(['article', tenantId, slug], { tags: [...] })
    ↓
withTenant(tenantId, tx => drizzle query)  → Postgres RLS enforces
    ↓
Render HTML (+ JSON-LD Article schema for SEO)
    ↓
ISR cache at edge
    ↓
Response
```

### Write Flow (post a photo)

```
Client → uploads to Blob via presigned URL → gets blob URL
       → calls Server Action `createPost({ blobUrl, caption })`
           ↓
           validate (Zod)
           ↓
           withTenant(tenantId, async tx => {
             insert post row
             insert media row linked to post
             insert search_outbox row
           })
           ↓
           revalidateTag(`tenant:${tenantId}:feed`)
           ↓
           inngest.send({ name: 'post.created', data })
           ↓
           return { postId }
    ↓
    Inngest 'post.created' handler:
      ├── media.process step → thumbnails + NSFW
      ├── fanout step → push to follower feed channels via Pusher
      └── moderation.scan step
    ↓
    Inngest 'search.flush' cron:
      └── drain outbox → Meilisearch
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users, 1 tenant | Everything on smallest tier: Neon free, Vercel Hobby/Pro, Pusher Sandbox, Meili free, Inngest free. Ignore optimization. |
| 1k-10k users, 2-5 tenants | Upgrade Pusher tier, move to Neon paid, enable Upstash Redis for feed caching. Watch Postgres connection count — add pgbouncer transaction pooling. |
| 10k-100k users, 5-20 tenants | Split feed reads to read replicas. Consider moving hot tenants to dedicated Meili indexes. Add CDN for blob storage if on Vercel Blob (or migrate to R2). Realtime cost review — evaluate Partykit migration. |
| 100k+ users | Per-tenant sharding only if one tenant dominates. Otherwise keep shared schema; RLS + good indexes scale further than you think. Full-text search likely dedicated Meili cluster. Realtime definitely needs cost engineering. |

### Scaling Priorities (what breaks first)

1. **Vercel serverless function duration** — long feed queries or N+1 queries cause timeouts. Fix with proper indexes and `JOIN`s, not architecture change.
2. **Postgres connection count** — serverless opens many connections. Fix with Neon's pooled connection or pgbouncer transaction mode from day one.
3. **Pusher message volume cost** — chat gets chatty. Fix by batching notification events server-side and limiting fanout on large rooms.
4. **Image optimization budget** — if using Vercel Image Optimization without a custom loader, costs explode. Fix: pre-generate variants in upload job.
5. **Search index size** — Meili free tier limits. Fix by tiering: index last 90 days hot, move older to deep-search via Postgres FTS fallback.

---

## Anti-Patterns

### Anti-Pattern 1: Passing tenant_id through function arguments from the client

**What people do:** Client sends `{ tenantId, postId }` in request body.
**Why it's wrong:** User can forge tenant_id and read/write another tenant's data (if app code trusts it).
**Do this instead:** Always derive tenant_id from middleware-injected header (`headers().get('x-tenant-id')`), verified against session's tenant_id. Client-supplied tenant_id is ignored.

### Anti-Pattern 2: Using Postgres LISTEN/NOTIFY for realtime from serverless

**What people do:** App opens a LISTEN on Postgres, fanning out via WS.
**Why it's wrong:** Serverless functions don't live long enough to hold LISTEN connections. Works on a long-running server; broken on Vercel.
**Do this instead:** Write to DB, then explicitly publish to a hosted WS broker (Pusher/Ably/Supabase Realtime).

### Anti-Pattern 3: Build-time theming per tenant

**What people do:** Generate a separate Next.js build per tenant with compiled theme.
**Why it's wrong:** One codebase, many deploys = defeats multi-tenant. Every tenant launch is a deploy.
**Do this instead:** Single build, CSS variables injected at request time from tenant config.

### Anti-Pattern 4: Tenant ID missing from cache keys

**What people do:** `unstable_cache(['article', slug], ...)` without tenant in key.
**Why it's wrong:** Two tenants with the same slug collide — one reads the other's data.
**Do this instead:** Tenant ID is the FIRST segment of every cache key and every cache tag.

### Anti-Pattern 5: Trigger-based search sync

**What people do:** Postgres trigger fires HTTP to Meilisearch on insert.
**Why it's wrong:** No retry, blocks writes, swallows errors, breaks pg-dump restore.
**Do this instead:** Outbox table + worker (Inngest drainer).

### Anti-Pattern 6: Same cookie domain across tenants

**What people do:** Set auth cookie on `.koral.com` so it covers all subdomains.
**Why it's wrong:** Breaks the silo promise — session leaks between verticals.
**Do this instead:** Scope cookies per host. `aquariumcommu.com` cookie is unrelated to `animecommu.com` cookie. Each tenant has its own session namespace.

### Anti-Pattern 7: Catching locale from path without handling 404s

**What people do:** Assume first path segment is always a locale.
**Why it's wrong:** `/robots.txt`, `/sitemap.xml`, `/api/...` don't have locale prefixes; middleware over-rewrites them.
**Do this instead:** Middleware matcher explicitly excludes `/api`, `/_next`, static files, and SEO files.

### Anti-Pattern 8: Schema-per-tenant "for isolation"

**What people do:** One Postgres schema per tenant.
**Why it's wrong:** At N=10 you're already hating migrations. At N=50 you're writing a schema orchestrator. Connection pooling breaks (schema is per-connection state).
**Do this instead:** Shared schema + `tenant_id` + RLS. Industry standard for solo-dev SaaS.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Pusher Channels | REST publish from Server Action / Inngest; client WSS via pusher-js | Auth endpoint signs private channels with tenant-scoped check |
| Neon/Supabase Postgres | Drizzle ORM with pooled connection; RLS session var per tx | Use serverless driver (`@neondatabase/serverless`) for edge compat |
| Vercel Blob / R2 | Presigned PUT URLs from Route Handler; public-read GET via CDN | Key prefix = tenant slug |
| Meilisearch Cloud | HTTP client from Inngest worker only (not per-request) | One index with tenant_id filter attribute |
| Inngest | HTTP endpoint at `/api/inngest`; functions in `server/jobs/` | Events sent from Server Actions with `inngest.send` |
| Upstash Redis | REST client, edge-compatible | Rate limit, feed cache, session store |
| Vercel Edge Config | Admin writes via API on tenant change | Mirror of tenants table for middleware |
| Resend / Postmark | Inngest worker sends transactional email | Per-tenant FROM addresses |
| Sightengine / moderation API | Inngest moderation job | Per-upload async |
| OpenAI / Anthropic | Inngest `ai.draft_article` job | Not in hot request path |
| Instagram / WhatsApp | Inngest `crosspost.publish` job | Outbound only in v1 |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| app ↔ server | Direct TS imports (same repo) | `server/` is a pure module |
| Server Action ↔ Inngest | Event send (fire-and-forget) | Async by design |
| Server Action ↔ Pusher | REST publish (fire-and-forget, but awaited for ordering) | Never block on failures — enqueue instead if critical |
| App ↔ Search | Writes via outbox; reads via direct Meili client | Reads can be sync from Route Handlers (search API) |
| Middleware ↔ Tenant registry | Edge Config (not Postgres) | Postgres is source of truth; Edge Config is hot read path |

---

## Build Order (with Dependencies)

This is the suggested sequence. Each item depends on all prior items.

1. **Foundations**
   - Next.js 15 App Router project, TypeScript, Tailwind, Biome/ESLint
   - Drizzle + Neon Postgres connected
   - Base `withTenant` helper + RLS policies on a dummy table (prove the pattern early)

2. **Tenant resolution skeleton**
   - `tenants` table (slug, domain, theme jsonb, default_locale, features jsonb)
   - `middleware.ts` reading from in-process JSON first (upgrade to Edge Config later)
   - Hardcode one tenant (aquariumcommu) in dev; rewrite to `/_tenants/aquarium/...`
   - Tenant-aware root layout injecting CSS vars from theme
   - **Gate:** visiting aquariumcommu.localtest.me renders tenant-themed page

3. **i18n routing**
   - next-intl installed, `en` and `es` message catalogs
   - Middleware handles locale prefix detection and rewrite
   - hreflang tags in `generateMetadata`
   - **Gate:** `/en/` and `/es/` render same page in both languages

4. **Auth with tenant silos**
   - NextAuth or Lucia configured
   - `users` table with `UNIQUE(tenant_id, email)`, session table with tenant_id
   - Signup / login / password reset flows, per-tenant cookies
   - OAuth for Google (tenant-scoped sub mapping)
   - **Gate:** same email registers independently on two tenants; sessions can't cross

5. **Content primitives (read path)**
   - Articles + threads + Q&A tables, all with tenant_id + locale + translation_group_id
   - RSC pages for article/thread/Q&A detail with ISR + unstable_cache tags
   - `generateMetadata` with tenant branding + JSON-LD schema
   - Tag, category, author pages
   - **Gate:** seeded articles render SSR, pass Lighthouse SEO, show correct theme

6. **Content write path**
   - Server Actions for post/article/thread create/update/delete
   - Server-rendered editor for articles (markdown or Tiptap)
   - Outbox table
   - revalidateTag on writes
   - **Gate:** writing and editing content invalidates the right caches

7. **Media pipeline**
   - Vercel Blob adapter, presigned upload URL endpoint
   - Inngest `media.process` job: variants + blurhash + EXIF strip + NSFW
   - `<Image>` components using custom loader
   - **Gate:** upload a photo → optimized variants served from CDN

8. **Search**
   - Meilisearch Cloud setup
   - Search outbox drainer (Inngest cron)
   - Search Route Handler with tenant filter
   - Search UI with facets
   - **Gate:** new content appears in search within N seconds, scoped to tenant

9. **Realtime infra**
   - Pusher app + auth endpoint (tenant-scoped channel auth)
   - `pusher-client` wrapper in `lib/`
   - Tenant-prefixed channel naming convention
   - Notifications table + delivery service (DB write + Pusher publish)
   - **Gate:** server-emitted notification appears in client in real time on correct tenant only

10. **Chat (DMs + rooms)**
    - Chat rooms + messages tables (tenant-scoped)
    - Server Actions to send messages (persist → publish)
    - Client chat UI subscribed to private channels
    - Unread counts, basic room management
    - **Gate:** two users chat in real time; third user on another tenant sees nothing

11. **Feed + notifications surfaces**
    - Feed builder (pull-model v1: query recent follows + tenant-wide hot posts)
    - Activity feed UI
    - In-app notification center
    - Email digest Inngest cron
    - **Gate:** new posts from followed users surface in feed without manual refresh

12. **Moderation + admin**
    - Reports table, mod queue UI
    - Role-based permissions (admin, mod, user) scoped per tenant
    - Soft-delete everywhere
    - Audit log
    - **Gate:** mod can remove content; user can report; admin can manage tenant config

13. **AI founding content**
    - Knowledge DB schema
    - Inngest `ai.draft_article` pipeline
    - Human curation UI
    - **Gate:** AI draft → curator edit → publish flow works

14. **Crosspost out**
    - Inngest `crosspost.publish` with IG + WA adapters
    - Per-user OAuth connection to IG Business
    - **Gate:** user publishes; post appears on IG

15. **Tenant launch operations**
    - Admin UI to create a new tenant (writes DB + syncs Edge Config)
    - Per-tenant domain verification + Vercel domain attach
    - Per-tenant theme upload
    - **Gate:** spinning up `animecommu.com` is a form submission, not a deploy

---

## Sources

- Next.js App Router docs (official, 2024-2025)
- Vercel Platforms Starter Kit (widely-referenced multi-tenant reference implementation)
- Postgres RLS documentation and Supabase multi-tenant guides
- Pusher Channels and Ably documentation (architecture patterns)
- Inngest documentation (serverless job patterns)
- Meilisearch multi-tenancy guide (single-index + filter pattern)
- next-intl documentation for App Router i18n
- General industry patterns for shared-schema multi-tenant SaaS

**Confidence notes:**
- HIGH on: shared-schema + RLS pattern, outbox pattern, presigned upload pattern, tenant-scoped cache keys, path-based i18n for SEO, middleware rewrite pattern
- MEDIUM on: specific vendor choice (Pusher vs Ably vs Supabase Realtime — depends on pricing and Supabase adoption choice)
- MEDIUM on: Inngest vs Trigger.dev — both solid; either works
- LOW on: exact Vercel Edge Config limits and pricing (re-verify at implementation time; WebSearch was unavailable)
- LOW on: current Meilisearch Cloud free-tier limits (re-verify)

---
*Architecture research for: multi-tenant niche social platform (Koral)*
*Researched: 2026-04-13*
