import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ── Tenants ──────────────────────────────────────────────────────────────────
// Source of truth for vertical registry. One row per domain (e.g. aquariumcommu.com).
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),        // 'aquarium', 'anime'
  domain: text('domain').notNull().unique(),    // 'aquariumcommu.com'
  name: text('name').notNull(),
  defaultLocale: text('default_locale').notNull().default('en'),
  // JSONB for real storage — theme tokens, colors, logo URLs
  themeLight: jsonb('theme_light').notNull().default({}),
  themeDark: jsonb('theme_dark').notNull().default({}),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  tagline: text('tagline'),
  heroImageUrl: text('hero_image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Users (one row per (tenant, email) — silo enforced by UNIQUE) ─────────────
// Pitfall 2: UNIQUE(tenant_id, email) is non-negotiable — never UNIQUE(email) alone.
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),              // stored lowercase by application
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    displayName: text('display_name').notNull().default(''),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    locale: text('locale').default('en'),        // D-14: persisted preference
    darkMode: boolean('dark_mode'),              // D-30: null = follow OS
    // Hierarchy tier (Phase 3 activates reputation loop; Phase 1 scaffolds with defaults)
    tier: text('tier').notNull().default('member'), // 'member' | 'verified_creator' | 'moderator' | 'admin'
    points: integer('points').notNull().default(0), // Phase 3 fills this in
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // THE critical silo constraint — AUTH-05, TENT-02, Pitfall 2
    uniqTenantEmail: uniqueIndex('users_tenant_id_email_unique').on(t.tenantId, t.email),
    tenantIdx: index('users_tenant_idx').on(t.tenantId),
  }),
);

// ── Accounts (Auth.js DrizzleAdapter required table) ─────────────────────────
// T-02-04: scoped per-tenant so same Google account creates independent Koral accounts.
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  (t) => ({
    // T-02-04: same Google sub creates independent rows per tenant
    uniqTenantProvider: uniqueIndex('accounts_tenant_provider_unique').on(
      t.tenantId,
      t.provider,
      t.providerAccountId,
    ),
  }),
);

// ── Sessions (Auth.js DrizzleAdapter required table) ─────────────────────────
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionToken: text('session_token').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (t) => ({
    tenantIdx: index('sessions_tenant_idx').on(t.tenantId),
  }),
);

// ── Verification Tokens (Auth.js DrizzleAdapter required table) ───────────────
// T-02-03: scoped to (tenant_id, identifier, token) — same OTP on tenant A is invalid on tenant B.
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(), // email address
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (t) => ({
    // Prevents cross-tenant OTP reuse — T-02-03
    pk: uniqueIndex('verification_tokens_pk').on(t.tenantId, t.identifier, t.token),
  }),
);

// ── Groups (4-tier hierarchy scaffold — D-25, D-32–D-36) ─────────────────────
// D-36: location is nullable — groups are interest-based, not geographic.
export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    coverImageUrl: text('cover_image_url'),
    location: text('location'),                   // D-36: NO .notNull() — interest-based groups don't require location
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').notNull().default(true),
    memberCount: integer('member_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('groups_tenant_idx').on(t.tenantId),
  }),
);

// ── Group Members (many-to-many users ↔ groups) ───────────────────────────────
export const groupMembers = pgTable(
  'group_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'), // 'member' | 'admin'
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqMember: uniqueIndex('group_members_unique').on(t.groupId, t.userId),
    tenantIdx: index('group_members_tenant_idx').on(t.tenantId),
  }),
);
