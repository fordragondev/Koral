# Koral

## What This Is

Koral is a multi-domain social media platform that creates dedicated, branded social networks for niche interest communities (aquariums, fitness, concerts, anime, bullfighting, etc.). Each interest vertical lives at its own domain (e.g. `aquariumcommu.com`, `animecommu.com`) so users feel they're in an exclusive space built specifically for their hobby — built for passionate people who love their hobbies and want to share content, knowledge, and experiences.

## Core Value

Make passionate hobbyists feel they have a *home* — a space that looks, sounds, and feels purpose-built for their community, not a generic forum or another subreddit lost in a sea of others.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-tenant Next.js + Postgres platform: one codebase serves many domains, each themed/scoped per vertical
- [ ] Per-domain account silos: users register on each vertical separately; each domain feels like its own platform
- [ ] First vertical: aquariums (`aquariumcommu.com`)
- [ ] Bilingual at launch: English and Spanish
- [ ] Content types v1: photos, articles/long-form, discussions/threads
- [ ] AI-assisted founding content: articles drafted from a knowledge database, then human-curated
- [ ] Curated contributor program: hand-picked writers after launch
- [ ] Volunteer moderation model (community-elected mods per topic)
- [ ] SEO-friendly (organic discovery is critical for word-of-mouth growth)
- [ ] Real-time notifications + activity feed
- [ ] Real-time live chat (DMs and topic chat rooms)
- [ ] Crosspost out to Instagram and WhatsApp
- [ ] Modern, mobile-first, photo-forward UX
- [ ] Knowledge structure: guides + Q&A linked together (not lost-in-thread chaos)
- [ ] Identity & status primitives: profiles, expert badges, reputation
- [ ] Ads-ready architecture (monetization comes later, but the platform must support it)

### Out of Scope

- Short-form video (TikTok-style) — deferred to v2; v1 focuses on photos, articles, discussions
- Aquarium-specific features (tank profiles, livestock logs, water-parameter tracking) — deferred to v2; v1 ships generic content surfaces only
- Subscription / marketplace monetization — ads-first, others later
- Multiple verticals at launch — prove the model with aquariums first, then replicate
- Per-vertical separate deployments or isolated databases — single multi-tenant app
- Bidirectional Instagram/WhatsApp sync (import, OAuth login) — v1 is crosspost-out only
- Live presence / typing indicators / live reactions — not in v1 realtime scope

## Context

- **Solo developer** building with AI as primary collaborator. Maintainability and shipping velocity matter more than enterprise-grade architecture.
- **Target audience:** passionate hobbyists. They will tolerate rough edges if the space *feels* like theirs and the content is high quality.
- **Discovery model:** word of mouth + SEO. No paid acquisition planned. This means the article/Q&A surfaces must rank well and be share-worthy.
- **Multi-tenant from day one:** even though only one vertical launches first, the platform must be architected so spinning up `animecommu.com`, `fitnesscommu.com`, etc. is a configuration change, not a fork.
- **Bilingual from day one:** Spanish is not a translation afterthought — the platform's roots include Spanish-speaking hobby communities (e.g. bullfighting was named explicitly).
- **AI-generated founding content** is a deliberate strategy: solo dev can't write thousands of articles, so the platform leans on a knowledge database + LLM drafting + human curation to seed each vertical with quality content before community contributors arrive.

## Constraints

- **Tech stack:** Next.js + Postgres, hosted on Vercel + managed Postgres (Neon/Supabase). Chosen for solo-dev velocity, SEO strength (SSR/ISR), and minimal ops.
- **Team:** Solo developer + Claude. Architectural choices must be maintainable by one person.
- **Multi-tenancy model:** Single app, single database, domain-based routing/theming. No per-vertical forks.
- **Account model:** Per-domain account silos (separate identity per vertical), even though the backend is shared.
- **i18n:** English and Spanish from v1. No machine translation as a substitute for native content.
- **Realtime:** Must support live chat + notifications + activity feed in v1. Choose infra that doesn't break the Vercel+Postgres serverless model (e.g. Pusher, Ably, Supabase Realtime, or a dedicated WS service).
- **SEO:** Article and Q&A pages must be server-rendered and indexable.
- **Monetization:** Ads-ready, not ads-live. Don't bake in ad SDKs in v1, but don't block them architecturally.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single multi-tenant Next.js app, many domains | Solo dev can't maintain many forks; domain routing + theming gives the "exclusive space" feel without the cost | — Pending |
| Per-domain account silos (not SSO across verticals) | Reinforces the "this is *my* community" feeling; users on aquariumcommu shouldn't see/feel anime users | — Pending |
| Aquariums as first vertical | Photo-rich, knowledge-hungry, underserved by modern UX, manageable scope | — Pending |
| AI-drafted founding content from knowledge DB | Solo dev can't seed content manually; quality bar maintained via human curation | — Pending |
| Bilingual EN/ES from v1 | Target communities include Spanish-speaking hobbyists; retrofitting i18n is painful | — Pending |
| Photos + articles + discussions in v1 (no video) | Scope control; video is expensive to build and moderate; content types chosen match SEO + knowledge goals | — Pending |
| Aquarium-specific features deferred to v2 | Validate the generic platform first; avoid coupling the engine to one vertical's quirks | — Pending |
| Volunteer mods + trust system | Solo dev can't moderate; community ownership reinforces the "home" feel | — Pending |
| Vercel + managed Postgres | Lowest-ops path for solo Next.js dev, strong SSR/ISR for SEO | — Pending |
| Crosspost-out only for IG/WA in v1 | Bidirectional integration is complex; outbound sharing covers the growth use case | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after initialization*
