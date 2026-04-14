# Requirements: Koral

**Defined:** 2026-04-13
**Core Value:** Make passionate hobbyists feel they have a home — a space purpose-built for their community, not a generic forum.

## v1 Requirements

Requirements for the first shippable vertical: aquariums (aquariumcommu.com).

### Authentication

- [ ] **AUTH-01**: User can sign in via email OTP code (passwordless — no password to remember)
- [ ] **AUTH-02**: User can sign in via OAuth (Google or Apple)
- [ ] **AUTH-03**: User session persists across browser refresh
- [ ] **AUTH-04**: User can sign out from any page
- [ ] **AUTH-05**: Auth is fully siloed per domain — same email creates independent accounts on each vertical

### Platform Hierarchy

- [ ] **HIER-01**: Platform has a 4-tier hierarchy: Community (domain) → Local Groups → Verified Creators → Members
- [ ] **HIER-02**: Members earn points for publishing content, receiving likes/upvotes, and having replies marked as accepted answers
- [ ] **HIER-03**: Member is auto-promoted to Verified Creator when accumulated points reach a configured threshold
- [ ] **HIER-04**: Verified Creator badge is displayed on profile, posts, and articles
- [ ] **HIER-05**: Points total is visible on user profile

### Profiles

- [ ] **PROF-01**: User can set display name, avatar image, and bio (max 500 chars)
- [ ] **PROF-02**: Profile displays current tier badge (Member / Verified Creator) and total points
- [ ] **PROF-03**: User can follow and unfollow other users
- [ ] **PROF-04**: User can view another user's public profile

### Local Groups

- [ ] **GRP-01**: Users can create a Local Group with name, description, city/region, and cover photo
- [ ] **GRP-02**: Users can request to join a Local Group
- [ ] **GRP-03**: Group admin can approve or reject join requests
- [ ] **GRP-04**: Each Local Group has a dedicated real-time chat room (members only)
- [ ] **GRP-05**: Group members can post event listings (title, date, location, description) — no RSVP system in v1

### Content

- [ ] **CONT-01**: User can create a photo post with caption
- [ ] **CONT-02**: Uploaded photos are compressed, resized, and converted to WebP automatically
- [ ] **CONT-03**: User can write and publish long-form articles using a rich text editor (Tiptap)
- [ ] **CONT-04**: User can start a threaded discussion with a question title and body
- [ ] **CONT-05**: User can reply within a discussion thread
- [ ] **CONT-06**: Thread author can mark a reply as the accepted answer
- [ ] **CONT-07**: User can edit their own post, article, or thread (within 24 hours)
- [ ] **CONT-08**: User can delete their own content

### Discovery

- [ ] **DISC-01**: Home feed with Hot tab (trending score) and New tab (chronological)
- [ ] **DISC-02**: User can browse content by category/topic
- [ ] **DISC-03**: User can search content using full-text search (English and Spanish)
- [ ] **DISC-04**: User can view a following feed — content from users they follow

### Multi-tenant Platform

- [ ] **TENT-01**: Each hobby vertical is served from its own domain with per-vertical branding (colors, logo, name)
- [ ] **TENT-02**: User accounts are siloed per domain — same email creates independent accounts per vertical
- [ ] **TENT-03**: Platform UI is fully bilingual (English and Spanish) from launch
- [ ] **TENT-04**: New verticals can be activated via configuration (no code changes required)

### SEO

- [ ] **SEO-01**: All content pages are server-rendered with structured JSON-LD metadata (Article, QAPage, DiscussionForumPosting, BreadcrumbList)
- [ ] **SEO-02**: Each vertical exposes a dynamic sitemap at `/sitemap.xml`

### Notifications + Activity

- [ ] **NOTF-01**: In-app notification bell with unread count (new reply, new follower, mention)
- [ ] **NOTF-02**: Activity feed showing recent actions by followed users (posted, replied, joined group)

### Realtime Chat

- [ ] **REAL-01**: Per-category topic chat rooms (community-wide, open to all members)
- [ ] **REAL-02**: Per-group chat rooms (visible only to group members)
- [ ] **REAL-03**: Chat messages appear in real-time without page reload

### Safety + Moderation

- [ ] **MODR-01**: User can report a post or user with a reason
- [ ] **MODR-02**: Volunteer moderators can review reports in a moderation queue with hide, lock, and ban actions
- [ ] **MODR-03**: All uploaded images are scanned for CSAM before being made publicly visible
- [ ] **MODR-04**: User can block another user (hides their content + prevents contact)

### Contributors

- [ ] **CTBR-01**: Admin can invite contributors to the platform with elevated publish rights
- [ ] **CTBR-02**: Contributors can publish articles directly without additional review

### Sharing

- [ ] **SHAR-01**: User can copy a shareable link to any post, article, or discussion
- [ ] **SHAR-02**: User can share content to WhatsApp via native share intent

---

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Events

- **EVNT-01**: Full Events content type with RSVP system
- **EVNT-02**: Attendee list and check-in for events
- **EVNT-03**: Event notifications (reminder, update, cancellation)

### Notifications (Enhanced)

- **NOTF-03**: Email notifications for new replies and new followers
- **NOTF-04**: Push notifications (PWA)
- **NOTF-05**: Notification preferences panel (per-type on/off)

### Content (Enhanced)

- **CONT-09**: Draft saving and scheduled publishing
- **CONT-10**: Post edit history visible to moderators

### Aquarium-Specific Features

- **AQUA-01**: Tank profile (name, size, setup photo, species list)
- **AQUA-02**: Livestock log (species, date added, health notes)
- **AQUA-03**: Water parameter tracker

### Crossposting (Enhanced)

- **SHAR-03**: Share to Instagram via Graph API (pending Meta app review)

### Founding Content Pipeline

- **ADMIN-01**: AI draft workflow (knowledge DB → draft → human review queue → publish)
- **ADMIN-02**: Admin CMS for managing founding content and draft approval

### Ads

- **ADS-01**: Ads-ready layout slots (reserved zones, no SDK in v1)
- **ADS-02**: Ad network integration (Google AdSense or Ezoic)

### Direct Messaging

- **MSG-01**: 1:1 direct messages between users

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Short-form video (TikTok-style) | High infra + moderation cost; not core to SEO/knowledge thesis |
| Downvotes | Damages hobby community warmth; Reddit-style negativity |
| Public karma leaderboards | Rewards volume over quality; gamification anti-pattern |
| Fully algorithmic feed | Requires ranking infra; contradicts community-feel product positioning |
| Cross-vertical SSO | Destroys per-domain account silo — the core product thesis |
| AMP | Google deprecated ranking advantage in 2021 |
| Real-time typing indicators / live presence | Out of scope per product decision; expensive on serverless |
| Stories (ephemeral content) | No SEO value; duplicates photo surface |
| Bidirectional IG/WA sync (import) | v1 is crosspost-out only |
| Email/password login | Replaced by passwordless OTP + OAuth |
| User-writable wiki | Curator model preferred over open wiki |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| HIER-01 | Phase 1 | Pending |
| TENT-01 | Phase 1 | Pending |
| TENT-02 | Phase 1 | Pending |
| TENT-03 | Phase 1 | Pending |
| TENT-04 | Phase 1 | Pending |
| CONT-01 | Phase 2 | Pending |
| CONT-02 | Phase 2 | Pending |
| CONT-03 | Phase 2 | Pending |
| CONT-04 | Phase 2 | Pending |
| CONT-05 | Phase 2 | Pending |
| CONT-06 | Phase 2 | Pending |
| CONT-07 | Phase 2 | Pending |
| CONT-08 | Phase 2 | Pending |
| SEO-01 | Phase 2 | Pending |
| SEO-02 | Phase 2 | Pending |
| SHAR-01 | Phase 2 | Pending |
| DISC-02 | Phase 2 | Pending |
| PROF-01 | Phase 3 | Pending |
| PROF-02 | Phase 3 | Pending |
| PROF-03 | Phase 3 | Pending |
| PROF-04 | Phase 3 | Pending |
| HIER-02 | Phase 3 | Pending |
| HIER-03 | Phase 3 | Pending |
| HIER-04 | Phase 3 | Pending |
| HIER-05 | Phase 3 | Pending |
| DISC-01 | Phase 3 | Pending |
| DISC-03 | Phase 3 | Pending |
| DISC-04 | Phase 3 | Pending |
| MODR-01 | Phase 4 | Pending |
| MODR-02 | Phase 4 | Pending |
| MODR-03 | Phase 4 | Pending |
| MODR-04 | Phase 4 | Pending |
| GRP-01 | Phase 5 | Pending |
| GRP-02 | Phase 5 | Pending |
| GRP-03 | Phase 5 | Pending |
| GRP-04 | Phase 5 | Pending |
| GRP-05 | Phase 5 | Pending |
| REAL-01 | Phase 5 | Pending |
| REAL-02 | Phase 5 | Pending |
| REAL-03 | Phase 5 | Pending |
| NOTF-01 | Phase 5 | Pending |
| NOTF-02 | Phase 5 | Pending |
| CTBR-01 | Phase 6 | Pending |
| CTBR-02 | Phase 6 | Pending |
| SHAR-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 50 total
- Mapped to phases: 50
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after roadmap creation*
