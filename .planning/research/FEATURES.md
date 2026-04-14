# Feature Research — Koral

**Domain:** Multi-tenant niche-community social platform (first vertical: aquariums)
**Researched:** 2026-04-13
**Confidence:** HIGH for table-stakes community-platform patterns (well-trodden: Discourse, Reddit, Strava, Letterboxd, Goodreads, Untappd, Fishlore, BackYardChickens, MonsterFishKeepers). MEDIUM for crossposting flows and ad-slot architectures (implementation detail varies). LOW confidence on anything specific to 2026 platform feature fashion — treated skeptically.

Reference points used throughout:
- **Discourse** (canonical modern forum; trust levels, categories, mod queue, digest email)
- **Reddit** (vertical communities, karma, crosspost, NSFW, mod tools, flairs)
- **Strava / Letterboxd / Goodreads / Untappd** (activity-centric, identity-heavy niche socials)
- **Fishlore / BackYardChickens / MonsterFishKeepers** (niche hobbyist forums — the direct Koral aquariums competitors)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these and Koral feels broken / amateur / abandoned on arrival. These are not differentiators — they are the cost of being taken seriously as a community platform in 2026.

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| **Email + OAuth signup** (Google minimum; Apple if iOS matters) | Passwords alone feel dated; OAuth removes friction | LOW | Per-domain silos still fine — OAuth identity hashed per tenant |
| **Email verification + password reset** | Baseline security expectation | LOW | — |
| **Public user profiles** (avatar, bio, location, join date, post list) | Identity is the hook of a community platform | LOW | Profile is also the SEO surface for "user X" queries |
| **Avatar upload with crop** | Faceless accounts feel like bots | LOW | Default gravatar fallback acceptable |
| **Follow / unfollow users** | Expected since Twitter; drives the activity feed | LOW | Per-tenant only |
| **Photo upload with EXIF strip + resize** | Photo-forward hobby (fish tanks, fish photos) | MEDIUM | Must strip GPS EXIF for safety; generate multiple sizes for responsive; WebP/AVIF |
| **Multi-photo posts / galleries** | One photo per post feels like 2010 | MEDIUM | Drag-reorder, captions per image |
| **Rich-text article editor** (headings, images, lists, links, embeds, code) | Long-form requires more than a textarea | MEDIUM-HIGH | TipTap/Lexical/ProseMirror; YouTube/Twitter oEmbed; paste-image-to-upload |
| **Threaded replies on discussions** | This is what "discussion" means to forum users | MEDIUM | Depth limit (Reddit caps visual nesting); "continue thread" link past N |
| **Draft auto-save** | Users expect this since Gmail; losing a long post is platform death | LOW-MEDIUM | Local + server-side; revisit on any device |
| **Edit after post** | Typos happen; not being able to fix them is absurd | LOW | — |
| **Edit history visible to mods** (optionally public) | Prevents stealth-editing gotchas after quotes/replies | LOW | Discourse does this publicly; works |
| **Delete own post** | Baseline user-agency expectation | LOW | Soft-delete for mod visibility |
| **Markdown support (at least in replies)** | Hobbyists paste links, code, parameters | LOW | TipTap/ProseMirror can output markdown |
| **@-mentions with autocomplete + notification** | Expected since Twitter/Slack | MEDIUM | Scoped per-tenant |
| **Hashtags / tags on posts** | Discovery + topical filtering | LOW-MEDIUM | Free-form vs curated decision — curated wins for SEO |
| **Categories / boards / topics** | Forums need a taxonomy; Reddit = subreddits, Discourse = categories | LOW | Per-tenant configurable |
| **Upvote / like on posts and replies** | Signals quality; expected in every modern social platform | LOW | Single heart/upvote simpler than upvote+downvote |
| **Sort feeds by Hot / New / Top** | The Reddit triad has become universal | LOW-MEDIUM | Hot = time-decayed score; Top needs a period selector |
| **Homepage feed** (at least: Hot, New, Following) | Users need an entry point other than "browse categories" | MEDIUM | 3 tabs minimum |
| **Category/topic pages with their own feed** | Browse-by-interest is how forums work | LOW | — |
| **Permalinks on every post and reply** | Sharing is table stakes | LOW | `/u/user`, `/p/slug`, `/c/category`, `/r/reply-anchor` |
| **Full-text search** (posts, articles, users, tags) | No search = product feels broken | MEDIUM-HIGH | Postgres FTS acceptable for v1; upgrade to Meilisearch/Typesense/Algolia when it hurts |
| **Search filters** (by category, author, date, type) | Raw search returns too much | LOW | Built on top of the search index |
| **In-app notifications** (bell icon, unread count, list) | The universal pattern | MEDIUM | DB-backed, realtime push via WS |
| **Notification preferences** (per-type on/off, per-channel: email/push/in-app) | Users will rage-quit if they can't turn things off | MEDIUM | Matrix of (event × channel) — keep minimal |
| **Email notifications + digest** | Retention depends on pulling users back; email is the highest-ROI channel | MEDIUM | Per-event + daily/weekly digest; one-click unsubscribe (CAN-SPAM/CASL) |
| **Web push notifications** | Free compared to native push; users expect it on mobile web | MEDIUM | Service worker + VAPID; not critical if email digest is strong |
| **Direct messages (1:1)** | Every social platform has DMs; users assume it | MEDIUM-HIGH | Abuse vector — needs report + block from day one |
| **Block user** | Required for DMs and for civility in public threads | LOW | Hides content + prevents DMs |
| **Report post / user** | Safety baseline; legally advisable | LOW | Feeds mod queue |
| **Moderation queue** (reported, flagged, new-user first posts) | Volunteer mods need a working inbox | MEDIUM | Discourse-style queue is the reference |
| **Mod actions** (hide post, lock thread, pin, move to category, close, delete) | These are the verbs mods need to do their job | MEDIUM | Audit-logged |
| **User bans** (temporary + permanent, with reason, appealable) | Required for basic safety | LOW-MEDIUM | Silo-scoped (ban is per-tenant) |
| **Audit log of mod actions** | Mods need accountability; users need recourse | LOW | Append-only table |
| **Rate limiting** (signup, posting, reporting) | Spam is the default state of the internet | LOW-MEDIUM | Per-IP + per-user + per-action; captcha fallback |
| **Antispam on signup** (hCaptcha/Turnstile + email verify + honeypot) | Forums without this die in a week | LOW | Cloudflare Turnstile is free and good |
| **SEO fundamentals** (SSR, `<title>`, meta description, canonical, `robots.txt`, XML sitemap, per-route OG/Twitter tags) | Koral's entire discovery plan is SEO — missing any of these is fatal | MEDIUM | Next.js App Router gives most of this; sitemap needs a generator |
| **Structured data (JSON-LD)**: `Article`, `DiscussionForumPosting`, `QAPage`, `BreadcrumbList`, `Person`, `Organization` | Google uses these to surface forum/Q&A content in SERPs — Discourse/Reddit rank largely because of this | MEDIUM | `DiscussionForumPosting` schema is Google's official forum schema (2024) |
| **Clean, slug-based URLs** | `/p/how-to-cycle-a-tank-abc123` not `/post?id=42` | LOW | — |
| **Mobile-responsive layout** | 60-70%+ of traffic on niche forums is mobile | MEDIUM | Mobile-first CSS; bottom nav on mobile |
| **Language switcher (EN/ES)** | Bilingual is a PROJECT.md requirement | LOW | `next-intl` or `next-i18next` |
| **Per-post content language tag** | Mixed-language communities need this for filtering and SEO hreflang | LOW-MEDIUM | Default from user locale, overridable |
| **GDPR cookie consent** (if ads later, if EU traffic) | Legal requirement | LOW | Third-party widget fine |
| **Data export** (GDPR Art. 20, CCPA) | Legal requirement in EU/CA/CA-US; users sometimes ask | LOW-MEDIUM | ZIP of JSON + uploaded media |
| **Account deletion** (GDPR Art. 17) | Legal requirement; ethically required | LOW | Soft-delete → hard-delete after grace period; anonymize posts or cascade-delete user choice |
| **Terms of Service + Privacy Policy pages** | Legally required; Google AdSense requires them | LOW | — |
| **Basic analytics** (Plausible / Umami / PostHog) | Solo dev must know what's working | LOW | Plausible is fastest; PostHog if you need funnels |
| **Uptime + error monitoring** (Sentry minimum) | Solo dev can't fight invisible bugs | LOW | Sentry free tier |

### Differentiators (Competitive Advantage)

Where Koral can actually win. These align with the Core Value in PROJECT.md: *make passionate hobbyists feel they have a home, not a generic forum*. Pick a few, do them well; don't try to do them all.

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| **Per-domain theming + branding** (colors, typography, hero imagery, iconography) | This is the entire Koral thesis — users must feel `aquariumcommu.com` was built for them, not forked from a generic template | MEDIUM | Theme config per tenant; aquarium = blue/teal, mossy greens, photo-forward |
| **Photo-forward home feed** (Letterboxd/Unsplash density, not Reddit's text density) | Hobbies like aquariums are visual; Fishlore looks like 2008, MFK looks like 2005 — visual modernity IS the competitive moat | MEDIUM | Masonry/grid layout for photo categories; text-first for articles/discussions |
| **AI-drafted founding articles with visible human curation** | Solves the cold-start problem (empty community is death); "Reviewed and edited by [human]" badge builds trust | MEDIUM | Pre-generate from knowledge DB; human-in-the-loop before publish; this is already a PROJECT decision |
| **Guides + Q&A structure linked to discussions (knowledge graph)** | MFK/Fishlore lose knowledge in 200-page threads; Koral extracts durable answers. This is *the* SEO + long-tail discovery play. Google rewards `QAPage` schema. | HIGH | Separate content types: `Guide`, `Question`, `Discussion`. A question can have an accepted answer. A discussion can cite a guide. Cross-links are bidirectional. |
| **"Answered" state on Q&A threads** (Stack Overflow style) | Hobbyists search for answers, not conversations. "Answered" means "you can trust this." | LOW-MEDIUM | Accepted-answer mechanic + `QAPage` JSON-LD |
| **Expert / contributor badges** (curated, not earned) | Curated contributor program is a PROJECT.md decision; badge makes it visible and creates aspirational identity | LOW | Admin-assigned; not gameable |
| **Trust levels** (Discourse model: New → Basic → Member → Regular → Leader) | Scales volunteer moderation without hiring; unlocks permissions gradually (upload, flag-weight, lounge access) | MEDIUM | Discourse's trust-level system is open-documented and battle-tested; copy it |
| **Community-elected volunteer mods per category** | PROJECT.md requirement; also a differentiator — most platforms appoint, Koral elects | MEDIUM | Nomination + vote UI; term limits optional |
| **Bilingual-first UX** (not a bolted-on translation) | Spanish is a PROJECT.md requirement; doing it *well* differentiates from Fishlore/MFK (English-only) | MEDIUM | `hreflang` tags, per-post language, separate sitemaps per language, NO machine-translated content in the index |
| **Crosspost-out to Instagram and WhatsApp** | PROJECT.md requirement; growth lever; most forums stop at "copy link" | MEDIUM-HIGH | IG: Graph API for business accounts only — tricky. WA: share-URL intent is easy. Start with WA + Twitter/X + copy-link; IG is a fast-follow. |
| **Photo categories as first-class feed surfaces** (`/photos/tanks`, `/photos/fish`) | Hobbyists love browsing photos; doubles as discovery + SEO for image search | LOW-MEDIUM | Just filtered feeds with a photo-grid layout |
| **Topic chat rooms** (per-category live chat, ephemeral) | Forums are async; chat rooms add a "hangout" energy that makes a community feel alive | MEDIUM-HIGH | Ephemeral (not indexed, not permanent) — sidesteps moderation-archive nightmare; Pusher/Ably/Supabase Realtime |
| **Activity feed ("what's happening")** | Shows newest photos, freshest threads, Q&A answered — a pulse of the community | MEDIUM | Materialized-view or event-stream driven |
| **Weekly email digest with personalization** (top posts in your categories + Q&A answered) | Highest-ROI retention lever; niche hobby users check email more than generic social users | MEDIUM | Mailgun/Resend + cron |
| **Tasteful, non-algorithmic-abusive default feed** | Positioning: "the hobby forum that respects you" — opposite of TikTok/Twitter outrage loops | LOW (policy) | Default = chronological + category filter; "Hot" as an option, not the default |
| **Per-tenant custom glossary / terminology** (tank-cycling, fishkeeping jargon on aquariumcommu; entirely different on animecommu) | Reinforces the "home" feel; helps search | LOW | Config file per tenant |
| **Server-side rendered article pages with print-perfect typography** | Hobby guides are reference material — they get bookmarked, printed, shared. Making them *beautiful* is a moat over generic forum CSS. | LOW-MEDIUM | Great typography is cheap and massively differentiating |

### Anti-Features (Commonly Requested, Often Problematic)

Things that sound good but should be deliberately NOT built. Listing these prevents scope creep and arguments later.

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| **Short-form video (TikTok clone)** | "Everyone has it" | Expensive to host + moderate + monetize; PROJECT.md already defers this | Photos + embedded YouTube links in articles |
| **Cross-vertical SSO / unified account** | "Why do I have to sign up again?" | Destroys the PROJECT.md thesis — the "exclusive space" feel comes from per-domain silos | Per-domain accounts; accept the friction as a feature |
| **Downvotes** | "Reddit has them" | Downvote brigading, dogpiling, polarization; kills the warm-hobby vibe | Single upvote/like + report button |
| **Karma as a public vanity score** | "Reddit has them" | Gamifies the wrong things (jokes > knowledge); breeds farming; creates hierarchies | Trust levels (private-ish, tied to permissions) + curated badges |
| **Real-time presence (who's online, typing indicators, live reactions)** | "Discord has it" | Expensive on serverless/Vercel; moderation/privacy nightmare; PROJECT.md out-of-scope | Activity feed (passive presence) |
| **Fully algorithmic home feed (TikTok-style)** | "The big platforms do it" | Requires huge data + ranking infra; encourages engagement bait; contradicts "tasteful, respects you" positioning | Chronological + Hot + Following tabs |
| **Stories (24h ephemeral posts, Instagram-style)** | "Users want to post quickly" | Duplicate surface to photos; ephemeral = no SEO value; extra moderation surface | Regular photo posts with fast upload |
| **In-platform marketplace / buy-sell-trade** | "Hobbyists love classifieds (MFK has them)" | Fraud, shipping disputes, legal (livestock shipping is regulated), payments complexity | External links / WA groups; revisit in v2+ |
| **Native mobile apps** | "Users expect an app" | 3x the work for a solo dev; PWA + push is 80% of the value | Responsive PWA with installability + web push; native in v2+ if traction demands |
| **User-writable wiki (MediaWiki style, anyone-can-edit)** | "Wikipedia works" | Version wars, vandalism, needs its own moderation system | Guides authored by curated contributors + "suggest an edit" flow |
| **Public karma leaderboards** | "Gamification drives engagement" | Rewards volume over quality; creates bad-faith posting | Category-level "top contributors this month" with curation, or nothing |
| **Bidirectional Instagram/WhatsApp import** | "Import my feed!" | OAuth + rate limits + media rights + privacy; PROJECT.md out-of-scope | Crosspost-out only |
| **AMP** | "Google rewards AMP" | Google deprecated AMP's ranking advantage in 2021; AMP is now dead weight | Just ship fast Next.js SSR/ISR; hit Core Web Vitals natively |
| **Per-post encryption / "secure mode"** | "Privacy!" | Breaks search, SEO, moderation, abuse response; contradicts the entire public-community model | HTTPS + good privacy defaults + data export |
| **Cryptocurrency tipping / NFTs** | "Monetize the community!" | Regulatory risk, scam vector, off-thesis, dated aesthetic in 2026 | Tasteful ads + (future) optional subscriptions |
| **Blockchain-based identity / reputation** | "Decentralization!" | Over-engineering; breaks per-tenant silos; no user demand in hobby niches | Standard identity system |
| **Forcing users to log in to read** | "Boost signups!" | Destroys SEO (Googlebot can't index) and word-of-mouth | Content is publicly readable; login for write actions |
| **Heavy cookie-based tracking + retargeting pixels** | "Ad CPMs" | GDPR/CCPA headache, erodes trust, slow pages, terrible first impression | First-party analytics (Plausible); server-side ad stitching when ads launch |
| **Email-gated content ("subscribe to read")** | "Grow the list!" | Kills SEO and share-ability | Optional newsletter subscribe CTA after reading |

---

## Feature Dependencies

```
Authentication (email + OAuth)
    └── requires ──> Per-tenant account silo
                         └── requires ──> Domain-based routing / middleware
                                              └── requires ──> Multi-tenancy (subject of ARCHITECTURE.md)

User profiles
    └── requires ──> Authentication
    └── enhances  ──> Follow system
                          └── enhances ──> Activity feed
                                              └── requires ──> Notifications infra

Rich-text article editor
    └── requires ──> Image upload pipeline
                         └── requires ──> Object storage + CDN
                         └── enhances  ──> Photo posts (shared pipeline)

Discussions (threaded replies)
    └── requires ──> Authentication + posting permissions
    └── enhances  ──> Q&A (Q&A is discussions + "accepted answer" semantics)

Q&A with accepted answer
    └── requires ──> Discussions
    └── requires ──> Reputation / trust (to prevent answer-spam)
    └── enhances  ──> SEO (QAPage JSON-LD)

Guides + Q&A knowledge graph
    └── requires ──> Articles + Q&A
    └── enhances  ──> Search (related-content surfaces)

Feeds (Hot / New / Following)
    └── requires ──> Posts exist
    └── "Following" requires ──> Follow system
    └── "Hot" requires ──> Score + time-decay job

Search
    └── requires ──> Posts indexed (FTS index or external)
    └── enhances  ──> Discovery, SEO sitelinks

Notifications (in-app + email + push)
    └── requires ──> Event bus / outbox pattern
                         └── enhances ──> Activity feed (same event stream)
    └── email digest requires ──> Transactional email (Resend/Mailgun)
    └── web push requires ──> Service worker + VAPID

Realtime chat (DMs + rooms)
    └── requires ──> WS infra (Pusher/Ably/Supabase Realtime)
    └── requires ──> Block + report (abuse prevention)
    └── requires ──> Authentication

Moderation queue
    └── requires ──> Report system
    └── requires ──> Mod role + permissions
    └── enhances  ──> Trust levels (auto-hide from untrusted users)

Trust levels
    └── requires ──> Account age + activity tracking
    └── enhances  ──> Moderation queue, posting permissions, DM access

Volunteer mod election
    └── requires ──> Trust levels (only trusted users can vote / be nominated)
    └── requires ──> Mod tooling (elected mods need something to do)

Crosspost to IG / WA
    └── requires ──> Posts exist with canonical URL + OG image
    └── IG requires ──> Instagram Graph API + business account (complex)
    └── WA is just a URL intent ──> easy

SEO (JSON-LD, sitemap, OG, hreflang)
    └── requires ──> SSR/ISR rendering
    └── requires ──> Per-post content-language tagging (for hreflang)
    └── enhances  ──> Everything (this is Koral's discovery engine)

i18n (EN/ES)
    └── requires ──> Per-tenant locale config + per-post language tag
    └── enhances  ──> SEO (hreflang alternates)

Ads-ready architecture
    └── requires ──> Page layout slots reserved
    └── requires ──> Consent management (GDPR)
    └── conflicts with ──> Heavy tracking / retargeting (anti-feature)

Data export (GDPR)
    └── requires ──> Stable per-user data model
    └── enhances  ──> Account deletion (same plumbing)
```

### Key dependency takeaways for roadmap ordering

- **Authentication + per-tenant silos + profiles** must land first. Everything else assumes them.
- **Posts / photos / articles / discussions** share one underlying content engine — build it once, expose three UIs.
- **Notifications infra is also activity-feed infra** — build one event bus, serve both. Don't build them as two systems.
- **SEO must be in from day one** — retrofitting JSON-LD, sitemap, and i18n hreflang into an existing app is painful and often done half-wrong. This is Koral's growth engine; it is not a "polish later" item.
- **Moderation tooling must land with the community launch**, not after. Volunteer mods need something to moderate *with*; launching without it means the founder moderates by SQL, and that doesn't scale past week 1.
- **Q&A "accepted answer" + `QAPage` JSON-LD is the highest-leverage SEO feature** and should not be punted to v2.
- **Realtime chat + IG crosspost are the two highest-complexity "expected" features** and are safe to defer to late-v1 without breaking the core experience.

---

## MVP Definition

The PROJECT.md constraints — solo dev, single vertical first, SEO-driven growth, bilingual, ads-ready — push the MVP toward a specific shape: **a beautiful, bilingual, SEO-grade hobby content platform with moderation, that happens to have social on top.** Not the other way around.

### Launch With (v1 — `aquariumcommu.com` ships)

Must-haves for the first vertical to be credible.

- [ ] **Multi-tenant app shell** — domain routing, per-tenant theming, per-tenant config (PROJECT.md constraint)
- [ ] **Authentication** — email/password + Google OAuth + email verify + password reset
- [ ] **Per-tenant account silos** — PROJECT.md constraint
- [ ] **User profiles** — avatar, bio, post list
- [ ] **Follow system** — per-tenant
- [ ] **Photo upload pipeline** — EXIF strip, resize, CDN, multi-photo galleries
- [ ] **Rich-text article editor** — TipTap or Lexical; images, headings, links, embeds
- [ ] **Articles content type** — SSR page, JSON-LD `Article`, OG tags, canonical, hreflang
- [ ] **Discussions content type** — threaded replies (depth-limited), upvote, lock, pin
- [ ] **Q&A content type** — question + answers + accepted-answer + `QAPage` JSON-LD (this is the SEO moat; do not cut)
- [ ] **Guides-to-Q&A linking** — manual cross-reference is fine in v1; the data model must support it
- [ ] **Categories** — configurable per tenant
- [ ] **Tags** — curated per tenant (free-form is a v1.x add)
- [ ] **Feeds** — Home (Hot + New + Following), Category, Photos grid
- [ ] **Search** — Postgres full-text search across posts, articles, users, tags
- [ ] **Notifications (in-app + email)** — event bus, bell icon, email per-event + daily digest, unsubscribe
- [ ] **Weekly email digest** — retention lever
- [ ] **Moderation queue + mod actions** — report, hide, lock, delete, move, ban, audit log
- [ ] **Trust levels (Discourse-style)** — at least 3 tiers (New / Member / Regular); unlocks posting rate + flag weight
- [ ] **Rate limits + antispam** — Turnstile on signup, per-action rate limits
- [ ] **Block + report user**
- [ ] **AI-drafted founding articles** — seed aquariumcommu with 30-100 curated guides before public launch (PROJECT.md strategy)
- [ ] **SEO baseline** — SSR, sitemap, robots.txt, JSON-LD (`Article`, `DiscussionForumPosting`, `QAPage`, `BreadcrumbList`, `Person`, `Organization`), OG/Twitter tags, canonical, hreflang EN/ES
- [ ] **i18n (EN + ES)** — UI strings, per-post content-language tag, hreflang
- [ ] **Language switcher**
- [ ] **Legal pages** — ToS, Privacy, Cookie policy
- [ ] **GDPR tools** — data export, account deletion, cookie consent
- [ ] **Basic analytics** — Plausible or PostHog
- [ ] **Error monitoring** — Sentry
- [ ] **Mobile-responsive / PWA installable**
- [ ] **Ads-ready layout slots** — reserved page regions, no ad code yet
- [ ] **Crosspost-out: copy-link + WhatsApp share intent + X/Twitter share** — IG is a v1.x follow-up

### Add After Validation (v1.x — still in milestone 1)

Trigger: first 500 users show up and moderation/retention signals suggest the core works.

- [ ] **Direct messages (1:1)** — adds retention and private collaboration; needs block/report infrastructure already built
- [ ] **Topic chat rooms** — ephemeral, per-category; needs WS infra (Pusher/Ably/Supabase Realtime)
- [ ] **Web push notifications** — service worker + VAPID, opt-in
- [ ] **Instagram crosspost** — after validating WA + X/Twitter flow; IG Graph API is a real project
- [ ] **Community-elected moderators** — nomination + vote UI; defer until there's a community big enough to elect
- [ ] **Expert/contributor badges** — assign when the curated contributor program launches
- [ ] **"Top contributors this month" per category** — lightweight reputation surface
- [ ] **Edit history visible publicly** — Discourse-style "this post was edited"
- [ ] **Saved posts / bookmarks**
- [ ] **Draft auto-save on server side** (local-first in v1 is fine)
- [ ] **Free-form tags + tag pages** — if curated tags aren't enough
- [ ] **Notification preference matrix** — per-event, per-channel
- [ ] **Activity feed surface** — "recent photos / fresh threads / answered questions" public homepage module
- [ ] **Photo category feeds** (`/photos/tanks`, `/photos/fish`)

### Future Consideration (v2+)

Deferred until PMF is proven on the first vertical.

- [ ] **Second vertical launch** (`animecommu.com` or similar) — the multi-tenant thesis validation
- [ ] **Short-form video** — PROJECT.md explicit v2
- [ ] **Aquarium-specific features** (tank profiles, livestock logs, water parameter tracking) — PROJECT.md explicit v2
- [ ] **Ads live** — ad network integration, consent, revenue share
- [ ] **Subscriptions / premium tier** — PROJECT.md: ads-first
- [ ] **Marketplace / classifieds** — anti-feature for v1, revisit later if demanded
- [ ] **Native mobile apps** — PWA-first until traction justifies
- [ ] **Bidirectional IG/WA sync** — PROJECT.md out-of-scope for v1
- [ ] **Machine translation surfaces** (as *opt-in*, not as indexed content) — don't pollute the SEO index
- [ ] **Events / meetups** — hobby communities love IRL
- [ ] **Live streaming / live AMAs** — post-scale
- [ ] **Advanced search** (Meilisearch / Typesense / Algolia) — when Postgres FTS starts hurting
- [ ] **Inline AI assistance** ("summarize this thread", "find related guides") — once content volume justifies
- [ ] **Dark mode** — nice-to-have (push to v1.x if trivial)

---

## Feature Prioritization Matrix

Solo-dev feasibility is baked into Implementation Cost — HIGH means "this will eat a week+ and has real operational complexity."

| Feature | User Value | Impl Cost | Priority |
|---|---|---|---|
| Multi-tenant shell + domain routing | HIGH | MEDIUM | P1 |
| Authentication + per-tenant silos | HIGH | LOW-MED | P1 |
| User profiles + follow | HIGH | LOW | P1 |
| Photo upload pipeline | HIGH | MEDIUM | P1 |
| Rich-text article editor | HIGH | MEDIUM | P1 |
| Discussions (threaded) | HIGH | MEDIUM | P1 |
| Q&A with accepted answer + `QAPage` JSON-LD | HIGH | MEDIUM | P1 |
| Guides ↔ Q&A linking (data model) | HIGH | LOW | P1 |
| Categories + curated tags | HIGH | LOW | P1 |
| Feeds (Hot / New / Following) | HIGH | LOW-MED | P1 |
| Postgres FTS search | HIGH | LOW-MED | P1 |
| In-app + email notifications + weekly digest | HIGH | MEDIUM | P1 |
| Moderation queue + mod actions + audit log | HIGH | MEDIUM | P1 |
| Trust levels (Discourse-style, 3 tiers) | HIGH | MEDIUM | P1 |
| Rate limits + Turnstile antispam | HIGH | LOW | P1 |
| Block + report | HIGH | LOW | P1 |
| SEO baseline (SSR, JSON-LD, sitemap, OG, hreflang) | HIGH | MEDIUM | P1 |
| i18n EN/ES + language switcher + per-post language | HIGH | MEDIUM | P1 |
| Per-tenant theming | HIGH | MEDIUM | P1 |
| AI-drafted founding content workflow | HIGH | MEDIUM | P1 |
| Legal pages + GDPR export + deletion + consent | HIGH | LOW | P1 |
| Analytics + Sentry | MED | LOW | P1 |
| Ads-ready layout slots (no ads live) | MED | LOW | P1 |
| Mobile PWA (installable + manifest) | HIGH | LOW | P1 |
| Crosspost: copy-link + WA + X share intent | HIGH | LOW | P1 |
| Direct messages (1:1) | HIGH | MED-HIGH | P2 |
| Topic chat rooms (ephemeral) | MED | HIGH | P2 |
| Web push notifications | MED | MEDIUM | P2 |
| IG crosspost (Graph API) | MED | HIGH | P2 |
| Community-elected mods | MED | MEDIUM | P2 |
| Expert/contributor badges | MED | LOW | P2 |
| Saved / bookmarks | MED | LOW | P2 |
| Notification preference matrix | MED | LOW-MED | P2 |
| Free-form tags + tag pages | MED | LOW | P2 |
| Edit history public | LOW-MED | LOW | P2 |
| Photo category grid feeds | MED | LOW | P2 |
| Public activity feed homepage module | MED | MEDIUM | P2 |
| Dark mode | MED | LOW | P2/P3 |
| Advanced search (Meilisearch/Typesense) | MED | MEDIUM | P3 |
| Native mobile apps | LOW (for v1) | HIGH | P3 |
| Short-form video | MED | HIGH | P3 |
| Marketplace | LOW-MED | HIGH | P3 (anti-feature for v1) |
| Subscriptions / premium | MED | MEDIUM | P3 |
| Second vertical | HIGH (thesis) | MED | P3 |

**Priority key:**
- **P1** — must ship for aquariumcommu v1 launch
- **P2** — ship within milestone 1 once P1 is validated
- **P3** — milestone 2+ or later

---

## Competitor Feature Analysis

Direct niche-forum competitors (Fishlore, BackYardChickens, MonsterFishKeepers) vs modern social/community benchmarks (Discourse, Reddit, Strava/Letterboxd). Koral's approach deliberately borrows from the modern benchmarks while attacking the direct competitors on UX, mobile, SEO structure, and bilingual support.

| Feature | Fishlore / MFK / BYC (vBulletin/Xenforo-era forums) | Discourse | Reddit | Strava / Letterboxd (niche social) | **Koral's approach** |
|---|---|---|---|---|---|
| **Visual design** | Dated, dense, desktop-first | Clean, modern, responsive | Utilitarian, dense | Beautiful, photo-forward, modern | Photo-forward, per-domain themed, mobile-first — **attack vector** |
| **Content types** | Threads only | Threads only (categories) | Posts + comments | Activity-specific (runs/reviews) | Photos + articles + discussions + Q&A + guides — **broader and linked** |
| **Knowledge structure** | Knowledge buried in 200-page threads | Threads + (optional) wiki | Wikis are rare and unmaintained | N/A | **Guides + Q&A as first-class, cross-linked** — the SEO moat |
| **Mobile UX** | Bad (forum reskin) | Good | Good (app) | Good (app) | PWA mobile-first, responsive, installable |
| **i18n** | Minimal / none | Decent (community translations) | Per-locale subreddits | English-dominant | **Bilingual EN/ES from day one, per-post language, proper hreflang** |
| **Moderation tools** | Basic (old vBulletin) | Excellent (queue, trust levels, flags) | Good (mod tools, AutoMod) | Minimal | **Discourse-level tooling: queue, trust, audit log, elected mods** |
| **Trust / reputation** | Post count | 5-tier trust levels | Karma + awards | Follower count | **Discourse trust levels + curated expert badges** (not public karma) |
| **Feed algorithm** | Thread-list chronological | Category + Latest + Top | Hot/New/Top/Rising + personalized | Following + Popular | Hot / New / Following (not personalized) — **positioning: not algo-abusive** |
| **Search** | Poor | OK (built-in) | OK (built-in, improving) | Decent | Postgres FTS v1, upgrade to dedicated engine when it hurts |
| **Realtime chat** | None | Limited (plugin) | Chat (rarely used) | None | **Ephemeral topic rooms + DMs** as a differentiator |
| **Notifications** | Email + in-app | Excellent + digest | App + email | App + email | In-app + email + digest, push in v1.x |
| **SEO** | Often good (old URLs, content depth) | Good | Excellent (dominant in SERPs) | Mixed | **SSR + full structured data + hreflang + Core Web Vitals** — bet-the-farm focus |
| **Crossposting out** | None | Copy link | Copy link | Copy link + IG/Strava export | **WA + X share + copy-link v1; IG Graph API v1.x** |
| **Ads** | Aggressive, ugly | Self-hosted, minimal | Native + display | Minimal (subscription-funded) | Ads-ready layout, tasteful, not live in v1 |
| **Account model** | One account | One account | One account, many subreddits | One account | **Per-domain silos** — unique to Koral's thesis |
| **Onboarding** | Barebones | Good | Good | Good | Clean signup + immediate category browse + "getting started" guide |
| **AI-authored content** | None | None | None | None | **Curated AI-drafted founding articles** — unique cold-start strategy |

---

## Solo-Dev Feasibility Flags

Items where solo-dev scope risk is highest and where the research recommends explicit care:

- **Rich-text editor** — pick TipTap or Lexical; do not roll your own. Image paste-to-upload is the single most requested feature and must work on day one.
- **Realtime infra (chat + notifications)** — use a managed WS service (Pusher / Ably / Supabase Realtime). Do NOT run your own Socket.IO on Vercel.
- **Image pipeline** — use Vercel's image optimizer + a single object store (R2, S3, Supabase Storage). Don't build a transcoding farm.
- **Email** — Resend or Mailgun. Template engine lives in-repo. Digest job runs on a cron (Vercel Cron / upstash QStash).
- **Search** — Postgres FTS is fine for six-figure post counts. Defer Meilisearch/Typesense until it hurts.
- **Moderation queue** — budget more time than you think. This is where solo-dev niche platforms die — not from feature gaps, but from a mod workflow that doesn't scale past one human.
- **JSON-LD structured data** — not hard, easy to skip, and the single highest-ROI SEO work. Treat it as P1, not polish.
- **i18n + hreflang** — retrofitting this is genuinely painful. Pick the i18n framework on day one and commit (`next-intl` is the current recommendation for App Router).
- **GDPR export + deletion** — build the *plumbing* on day one (even if the UX is crude). Adding it after the fact means walking the entire data model looking for per-user rows.
- **Instagram Graph API crosspost** — this is a multi-day project with a real approval process. Budget appropriately or defer to v1.x.
- **Trust levels + permissions matrix** — design the permission check once, at the controller layer. Do not scatter `if user.trust_level > X` across the codebase.
- **Ads-ready without ads-live** — just means layout slots. Do not integrate an SDK in v1. Do not track users for ads in v1. Doing so creates GDPR exposure for zero revenue.

---

## Sources

Research is primarily drawn from direct knowledge of these reference platforms and their public documentation. Confidence is HIGH for table-stakes patterns (these are well-documented across dozens of community platforms for 15+ years) and MEDIUM for specific implementation details that change frequently (IG API capabilities, Google structured-data schema names/support). No claims here depend on post-cutoff information.

- **Discourse** — `meta.discourse.org` — canonical reference for trust levels, moderation queue, category structure, digest email, new-user onboarding. Open-source; docs and implementation are public.
- **Reddit** — feature set widely documented; relevant for Hot/New/Top sort, crosspost semantics, mod tooling patterns, `DiscussionForumPosting` schema adoption.
- **Stack Overflow / Stack Exchange** — Q&A accepted-answer pattern, reputation/privilege model (inspired Discourse's trust levels).
- **Letterboxd / Strava / Untappd / Goodreads** — niche social UX benchmarks: photo/media-forward feeds, activity feeds, follow-first identity, review-heavy content types.
- **Fishlore / BackYardChickens / MonsterFishKeepers** — direct niche hobby forum incumbents, 2000s-era vBulletin/Xenforo stacks; analyzed for what Koral is attacking (dated mobile UX, knowledge buried in threads, English-only).
- **Google Search Central — Structured Data docs** — `Article`, `DiscussionForumPosting` (officially added by Google in 2024 for forums), `QAPage`, `BreadcrumbList`. `QAPage` rich results are a durable SEO lever for hobby communities.
- **Google Search Central — hreflang documentation** — bilingual SEO requirements.
- **GDPR Articles 17 (erasure) and 20 (portability)** — legal baseline for data-export and deletion.
- **Next.js App Router + `next-intl` documentation** — i18n/SSR patterns for multi-locale sites.
- **Vercel + Supabase Realtime / Pusher / Ably documentation** — realtime options compatible with the PROJECT.md Next.js + Postgres constraint.

**Confidence caveats:**
- Specific 2026 Google ranking signals and SERP features for `QAPage` / `DiscussionForumPosting` are MEDIUM confidence — the schemas are real and supported, the exact SERP treatment evolves.
- Instagram Graph API crossposting requirements for non-business accounts are MEDIUM confidence — Meta has tightened this repeatedly; treat as "requires a real spike" before promising to users.
- PWA web-push support on iOS is HIGH confidence as of 2026 for installed PWAs (Apple shipped this in iOS 16.4 and it has been stable since).

---
*Feature research for: multi-tenant niche social / hobby community platform (Koral, first vertical: aquariums)*
*Researched: 2026-04-13*
