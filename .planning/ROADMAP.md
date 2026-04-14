# Roadmap: Koral

## Overview

Koral ships as a multi-tenant social platform for hobby communities, starting with the aquarium vertical. The journey moves from a locked-down multi-tenant foundation (auth, i18n, per-domain silos, hierarchy schema) through content publication with SEO baked in from day one, through identity and reputation, through a mandatory safety gate, through community features and realtime, and finally through contributor and sharing tooling that enables the platform to grow organically.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Multi-tenant shell, per-domain auth, i18n, and the 4-tier hierarchy data model
- [ ] **Phase 2: Content + SEO** - All v1 content types (photos, articles, discussions) with SEO infrastructure shipping simultaneously
- [ ] **Phase 3: Identity + Discovery** - User profiles, follow graph, reputation/points system, feeds, and full-text search
- [ ] **Phase 4: Safety + Moderation** - Hard gate: CSAM scanning, moderation queue, report/block — required before public beta
- [ ] **Phase 5: Groups + Realtime** - Local Groups with group chat, community topic chat rooms, notifications, and activity feed
- [ ] **Phase 6: Contributors + Sharing** - Contributor program with elevated publish rights and social sharing to WhatsApp

## Phase Details

### Phase 1: Foundation
**Goal**: The platform runs at a real domain, routes per-tenant, enforces per-domain account silos, serves English and Spanish, and has the 4-tier hierarchy baked into the schema — every subsequent feature builds on this
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, TENT-01, TENT-02, TENT-03, TENT-04, HIER-01
**Success Criteria** (what must be TRUE):
  1. A user can sign in via email OTP or Google/Apple OAuth on aquariumcommu.com and that account is completely separate from the same email on any other vertical
  2. A signed-in session survives a browser refresh and the user can sign out from any page
  3. The UI renders in English and Spanish with a language toggle — no untranslated strings visible
  4. The database schema includes the Community → Local Groups → Verified Creators → Members hierarchy and domain-scoped tenant rows
  5. A new vertical can be activated by adding a config row — no code change required
**Plans**: TBD
**UI hint**: yes

### Phase 2: Content + SEO
**Goal**: Users can create and discover photos, articles, and threaded discussions; every content page is server-rendered with JSON-LD and a live sitemap — SEO infrastructure ships with content, not after
**Depends on**: Phase 1
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, CONT-08, SEO-01, SEO-02, SHAR-01, DISC-02
**Success Criteria** (what must be TRUE):
  1. A user can publish a photo post with caption, write a long-form article with a rich text editor, and start a threaded discussion — all within the same domain
  2. Uploaded photos are automatically compressed and converted to WebP before being stored
  3. A discussion thread author can mark a reply as the accepted answer, and any user can edit or delete their own content within 24 hours
  4. Every article, photo, and discussion page returns valid JSON-LD structured data (Article, QAPage, or DiscussionForumPosting) in the server-rendered HTML
  5. /sitemap.xml for each vertical lists all published content and is accessible to crawlers
**Plans**: TBD
**UI hint**: yes

### Phase 3: Identity + Discovery
**Goal**: Users have public profiles with badges and points, can follow each other, and can find content through feeds, category browsing, and full-text search — the reputation loop is fully functional
**Depends on**: Phase 2
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, HIER-02, HIER-03, HIER-04, HIER-05, DISC-01, DISC-03, DISC-04
**Success Criteria** (what must be TRUE):
  1. A user can set a display name, avatar, and bio; the profile page shows their current tier badge (Member or Verified Creator) and their total points
  2. A user earns points for publishing content, receiving likes, and having a reply marked as an accepted answer — points accumulate and are visible on their profile
  3. A user is automatically promoted to Verified Creator when their points reach the configured threshold, and the badge appears on their profile, posts, and articles
  4. A user can follow another user and see their content in a dedicated following feed; unfollowing removes that content from the feed
  5. A user can search content in both English and Spanish using full-text search and browse content by category/topic
**Plans**: TBD
**UI hint**: yes

### Phase 4: Safety + Moderation
**Goal**: The platform cannot expose CSAM, has a functional moderation queue for volunteer mods, and gives users report and block controls — this phase is a hard gate before any public beta traffic
**Depends on**: Phase 3
**Requirements**: MODR-01, MODR-02, MODR-03, MODR-04
**Success Criteria** (what must be TRUE):
  1. Every image uploaded to the platform passes an automated CSAM scan before becoming publicly visible — images that fail the scan are never served
  2. Any user can report a post or another user with a reason, and a volunteer moderator can review that report in a moderation queue and take hide, lock, or ban action
  3. A user can block another user and that user's content disappears from their view and the blocked user cannot contact them
**Plans**: TBD

### Phase 5: Groups + Realtime
**Goal**: Users can create and join Local Groups with dedicated chat rooms, community-wide topic chat rooms exist, and notifications and the activity feed surface relevant events in real time
**Depends on**: Phase 4
**Requirements**: GRP-01, GRP-02, GRP-03, GRP-04, GRP-05, REAL-01, REAL-02, REAL-03, NOTF-01, NOTF-02
**Success Criteria** (what must be TRUE):
  1. A user can create a Local Group with name, description, city, and cover photo; other users can request to join and the group admin can approve or reject requests
  2. Group members can post event listings (title, date, location, description) inside their group
  3. Each Local Group has a real-time chat room visible only to its members; community-wide topic chat rooms are open to all members
  4. Chat messages appear in real time without a page reload across all chat rooms
  5. The in-app notification bell shows an unread count and surfaces new replies, new followers, and mentions; the activity feed shows recent actions by followed users
**Plans**: TBD
**UI hint**: yes

### Phase 6: Contributors + Sharing
**Goal**: Admins can invite trusted contributors with elevated publish rights, and users can share content to WhatsApp — the growth and curation loops are complete
**Depends on**: Phase 5
**Requirements**: CTBR-01, CTBR-02, SHAR-02
**Success Criteria** (what must be TRUE):
  1. An admin can send a contributor invitation; the invited user gains elevated publish rights and can publish articles directly without additional review
  2. A user can share any post, article, or discussion to WhatsApp via native share intent from the content page
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/TBD | Not started | - |
| 2. Content + SEO | 0/TBD | Not started | - |
| 3. Identity + Discovery | 0/TBD | Not started | - |
| 4. Safety + Moderation | 0/TBD | Not started | - |
| 5. Groups + Realtime | 0/TBD | Not started | - |
| 6. Contributors + Sharing | 0/TBD | Not started | - |
