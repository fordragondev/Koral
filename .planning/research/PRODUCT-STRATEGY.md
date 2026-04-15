# Koral — Product Strategy
*Aquarium social network · differentiation, innovation, gaps & must-haves*

---

## Core Concept

A social media platform built around user articles and videos, where users interact via chat, rate or add content to articles, and share experiences. The community is anchored around **two identity units: tanks and articles** — a user's profile is the sum of what they keep and what they know.

Just as a user can create a tank profile to document their setup, they can also create guides ("How to cycle a tank", "How to treat ich without medication", "How to breed cardinal tetras") that live permanently on their profile. The combination of tanks + articles builds a credible, multidimensional hobbyist identity that no other platform offers.

**This is not:**
- A forum with hundreds of repeated threads
- A static fish or plant profiles database
- A simple chat with no context

---

## The Dual Identity Model

The user profile is structured around two pillars that reinforce each other:

**Tanks** → *what you keep* — your setups, species, parameters, and the lived experience of running an aquarium over time.

**Articles** → *what you know* — guides, how-tos, species deep-dives, troubleshooting writeups, and experience reports you've authored.

Together they answer the two questions every hobbyist asks when they encounter someone online: *"What does their tank look like?"* and *"Do they actually know what they're talking about?"* A user with three well-documented tanks and five detailed guides carries far more credibility than a username with post count. This dual model is the platform's core moat.

### How they connect

- An article can be linked to a specific tank: "How I solved persistent green algae in my 120L planted tank" is anchored to that tank profile, with real parameters and photos as evidence.
- A tank profile can surface all articles the owner has written that reference it — making it a living case study, not just a static gallery.
- When users chat and reference a guide, they can link either a site-curated article or a community-authored one from a verified expert, collapsing the gap between official documentation and lived experience.

---

## Differentiation vs Current Options

### What makes this different vs Reddit / Discord / Facebook Groups

**Tanks + articles as dual identity** *(Core differentiator)*
A user's profile is built from what they keep and what they've written. No other platform in the hobby treats both as first-class, permanent, attributed content. Reddit posts vanish into threads; Facebook posts decay. Here, your knowledge compounds.

**Knowledge is attributed and durable** *(Core differentiator)*
Every guide lives at a permanent URL under its author's profile. It can be rated, updated, linked to from chat, and surfaced in search. Unlike Reddit answers, it doesn't disappear when the thread goes cold.

**Context-aware chat references** *(Core differentiator)*
Answering "how do I fix nitrite spikes?" links directly to a curated or community guide — not a 2,000-word re-explanation. Chat becomes a thin layer on top of structured, attributed knowledge.

**Not a forum, not a database** *(Positioning)*
Reddit has noise. Seriously Fish is static. Aquabid has no community. This occupies the gap: living, social, rich-media knowledge — where the community IS the content, and content has authors who stand behind it.

**Experience-first, not question-first** *(Positioning)*
Users share tank journeys and write guides from real experience rather than only asking questions. Discovery is browsing beautiful setups and reading expert how-tos, not wading through search results.

---

## Innovation Opportunities

### High value · buildable

**Article linked to tank as evidence**
A guide about fixing algae becomes more trustworthy when it's attached to a real tank with real parameter logs. The platform should make it trivially easy to embed a tank's data (species list, parameters, photos) directly into an article as a "case study" block.

**Tank journal with parameter timeline**
Users log pH, ammonia, nitrite, nitrate, temperature over time. The platform auto-generates a visual timeline. Articles and events can be pinned to specific dates — "this is when the algae bloom happened" — turning the tank into a living research log.

**Compatibility checker**
Before posting "can I add X fish to my tank?", users run a check against their tank profile's species list. The platform warns about aggression, temperature, pH conflicts. Reduces repetitive questions dramatically.

**Trade & local classifieds**
Localised listings for selling/trading fish, plants and equipment. Tied to location field on user profile. Keeps the community loop closed — no need for Facebook Marketplace or Aquabid for local trades.

### Medium value · strategic

**AI-assisted article enrichment**
When a user writes an article mentioning a species name, the platform auto-suggests linking to a species card (water params, care level, compatibility tags). Makes user-authored content structured and cross-referenceable by default.

**Tank progression gallery**
"Month 1 → Month 6 → Month 18" — photo/video progression of a single tank over time. Highly shareable and produces the sticky content loops that bring users back.

**Article series / collections**
Users can group their articles into a series ("My complete guide to the Walstad method — parts 1–5"). This rewards prolific contributors and gives readers a structured learning path through a topic.

### Longer term

**Expert badge & verified guides**
Community-voted experts in specific niches (planted tanks, nano setups, discus breeding) get verified badges. Their articles are featured and ranked higher in search. Creates trusted signal in a space full of conflicting advice.

**Guide rating with structured feedback**
Beyond upvotes: readers can tag what made an article useful — "well explained", "backed by data", "worked for me" — giving authors qualitative feedback and helping readers skim quality at a glance.

---

## Missing Features (Gaps in Current Spec)

### Not in spec

**Species / plant database**
You said "not a static database" — but you need a minimal one. Without species cards, you can't do compatibility checks, auto-tagging, or search by "who keeps Cardinal Tetras near me." Keep it lean and community-maintained, not curated by staff.

**Notification & follow system**
Users need to follow tanks, authors, articles, topics and tags. Without a feed of followed content, there's no retention loop. This is table stakes for any social platform.

**Search & discovery engine**
How do new users find content? Full-text search across articles, tank profiles, and species. Tag-based filtering (e.g. "planted · 100L · South American · beginner") is the main discovery path for both hobbyists and readers.

**Moderation & reporting**
No mention of content flags, moderator roles, or spam protection. Without this, groups degrade fast. You need it on day one, not after the first crisis.

### Weak in spec

**Article versioning and edit history**
Guides go stale. A "How to treat ich" article written in 2024 may need updating in 2026. The platform should track edits, show "last updated" dates, and let the community flag outdated content. This is especially important since articles are permanent and attributed.

**Mobile-first media upload**
Most aquarium photos/videos are taken on phones. The spec mentions pictures/video on tank profiles but doesn't address upload flow, compression, or thumbnail generation. This is a UX bottleneck for both tank profiles and article embeds.

**Onboarding for new hobbyists**
New fishkeepers are the largest growth segment. A guided "set up your first tank" flow that walks through profile creation and connects them with beginner guides and groups dramatically improves early retention.

---

## Potential Problems & Risks

### Critical

**Empty network problem** *(Cold start)*
A social platform with zero content is a ghost town. You need a content seeding strategy: invite 50–100 prolific hobbyists to build their tank profiles and write seed articles before launch. The article model helps here — one expert writing 10 quality guides generates more value than 100 users with empty profiles.

**Conflicting advice quality** *(Trust)*
Fishkeeping forums are notorious for bad advice (e.g. "goldfish are fine in a bowl"). Since articles are permanent and attributed, bad guides with author names attached erode trust fast. Quality signals — ratings, expert verification, source citations, edit dates — are not optional.

### Medium

**Low posting frequency niche** *(Retention)*
Most hobbyists change their tank infrequently. The article model partially solves this: even if your tank doesn't change, you can write. But the platform still needs passive engagement loops — browsing setups, reading guides, checking compatibility — not just content creation.

**Niche fragmentation** *(Community)*
Planted tank people, reef/saltwater people, goldfish people, and breeders have almost no overlap in either tanks or articles. Groups and tag-based feeds solve this partially, but homepage personalisation is essential to avoid incoherence.

**Article ownership and plagiarism** *(Trust)*
If articles are attributed and permanent, users will copy guides from other sites and post them as their own. You need duplicate detection, clear attribution policies, and a report flow for plagiarised content.

**Trade & invasive species liability** *(Legal)*
If you add classifieds or trade features, some species are illegal to sell/own in certain countries (e.g. snakeheads, certain plecos). The platform needs geo-aware warnings and clear terms of service.

### Watch

**Competing with Instagram & TikTok** *(Growth)*
Beautiful tank videos thrive on TikTok/Instagram. Your differentiation is depth of context (params, species, build logs, written knowledge) not visual quality. The article layer is your strongest argument for why someone should post here AND on Instagram, not instead.

---

## Must-Have Features

### Day 1 — without these, you can't open

| Feature | Description |
|---|---|
| Tank profile | Type, size, photo, species list, water params. First identity pillar. |
| Article creation + rating | Rich text, image embed, tag system, rating. Second identity pillar. |
| User profile with tanks + articles | Profile page shows both pillars side by side. The combined identity. |
| Follow + feed | Follow users, tanks, articles, and tags. Feed of followed content. |
| Search & tag filtering | Find content by species, tank type, topic, location. Core discovery path. |
| Groups | Join/create groups by topic (planted, reef, nano, etc.). Group feed and member directory. |
| Moderation baseline | Report button, basic content flags, admin panel. Non-negotiable before public launch. |

### Month 3 — needed for retention

| Feature | Description |
|---|---|
| Chat with article references | Link to community or curated guides mid-conversation. Your core differentiator. |
| Article linked to tank (case study block) | Embed a tank's real data as evidence inside an article. Closes the tank ↔ article loop. |
| Tank journal / timeline | Log entries with parameters. Pinned to dates. Makes tanks feel like living research. |
| Compatibility checker | Check species against tank profile before posting a question. |
| Events | Local meetups, online talks, auctions. Calendar view + RSVP. |
| Expert verification | Trusted contributor badges for both tank keepers and article authors. |

### Year 1 — needed for growth

| Feature | Description |
|---|---|
| Article series / collections | Group related guides into a learning path. Rewards prolific contributors. |
| Article versioning + edit history | Show last-updated dates, track changes, let community flag outdated guides. |
| Trade & local classifieds | Buy/sell/trade with geo-aware listings and species safety warnings. |
| Tank progression gallery | Time-lapse style photo journals per tank. Highly shareable. |
| AI-assisted article enrichment | Auto-link species names to cards as users write. |
| Mobile app | Dedicated iOS/Android app with camera-first upload and article editor. |

---

## Key Strategic Conclusions

**The dual identity model is your moat.** Tanks show what you keep. Articles show what you know. Together they build hobbyist credibility that no forum post count, no Instagram follower count, and no Discord role ever could. Make both first-class citizens of the user profile from day one.

**Articles solve the cold start problem — partially.** A single expert writing 10 detailed guides generates more seeding value than 100 users with empty tank profiles. Prioritise recruiting knowledgeable writers and early contributors before launch, not just tank owners.

**Knowledge compounds; make that visible.** Show users how their article has been read, cited in chat, and linked across the platform. Contributors who can see their guides being used stay engaged even when their tank isn't changing.

**Depth beats breadth at launch.** It's more valuable to dominate one niche (say, planted freshwater tanks) with obsessive quality in both tank profiles and articles than to spread across reef, planted, goldfish, and breeding simultaneously. Pick one, nail it, expand.

**Two missing features remain highest priority:** a lightweight species/plant database (community-maintained) and a notification + follow system. Without those, users have no reason to return between posting days.