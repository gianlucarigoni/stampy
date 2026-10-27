import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  unique,
  uniqueIndex,
  index,
  foreignKey,
  check,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const memberRole = pgEnum("member_role", ["owner", "staff"]);
export const promotionType = pgEnum("promotion_type", ["stamps"]);
export const walletProvider = pgEnum("wallet_provider", ["google", "apple"]);
export const walletStatus = pgEnum("wallet_status", ["not_added", "active", "removed"]);
export const requestStatus = pgEnum("request_status", ["pending", "approved", "rejected", "expired"]);
export const eventType = pgEnum("event_type", ["stamp", "redeem"]);
export const identityProvider = pgEnum("identity_provider", ["email", "google"]);
export const otpChannel = pgEnum("otp_channel", ["email"]);
export const authEventType = pgEnum("auth_event_type", [
  "otp_sent",
  "otp_send_blocked",
  "otp_failed",
  "otp_verified",
  "login_success",
  "identity_linked",
  "google_untrusted_email_rejected",
  "logout",
  "session_revoked",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // email verificata (OTP o IdP autorevole). NULL = nessuna email verificata, oppure utente anonimizzato
    email: text("email"),
    displayName: text("display_name"),
    isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("users_email_uq").on(t.email),
    // normalizzazione: solo trim e minuscolo (niente rimozione di punti o +alias)
    check("users_email_normalized_ck", sql`${t.email} = lower(btrim(${t.email}))`),
  ],
);

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    provider: identityProvider("provider").notNull(),
    // provider "email": l'email normalizzata; provider "google": il claim "sub"
    providerUserId: text("provider_user_id").notNull(),
    emailAtProvider: text("email_at_provider"),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [
    unique("auth_identities_provider_uq").on(t.provider, t.providerUserId),
    unique("auth_identities_user_provider_uq").on(t.userId, t.provider),
    check(
      "auth_identities_email_normalized_ck",
      sql`${t.provider} <> 'email' OR ${t.providerUserId} = lower(btrim(${t.providerUserId}))`,
    ),
    check(
      "auth_identities_email_at_provider_ck",
      sql`${t.emailAtProvider} IS NULL OR ${t.emailAtProvider} = lower(btrim(${t.emailAtProvider}))`,
    ),
  ],
);

export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(), // opaco, restituito al client
    channel: otpChannel("channel").notNull(),
    destination: text("destination").notNull(), // email normalizzata
    codeHash: text("code_hash").notNull(), // HMAC del codice, mai il codice in chiaro
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }), // usata con successo
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }), // sostituita o esaurita
    createdAt: createdAt(),
  },
  (t) => [
    // una sola sfida attiva per destinatario: l'invio chiude la precedente nella STESSA transazione
    uniqueIndex("otp_challenges_one_active_uq")
      .on(t.channel, t.destination)
      .where(sql`${t.consumedAt} IS NULL AND ${t.invalidatedAt} IS NULL`),
    // cooldown e tetto orario degli invii
    index("otp_challenges_destination_idx").on(t.channel, t.destination, t.createdAt),
    check("otp_challenges_attempts_ck", sql`${t.attempts} >= 0`),
    check(
      "otp_challenges_destination_ck",
      sql`${t.channel} <> 'email' OR ${t.destination} = lower(btrim(${t.destination}))`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull(), // SHA-256 del token casuale, mai il token
    authProvider: identityProvider("auth_provider").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [unique("sessions_token_hash_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

// Log di sicurezza append-only: l'applicazione non fa mai UPDATE né DELETE
export const authEvents = pgTable(
  "auth_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }), // NULL = utente sconosciuto
    type: authEventType("type").notNull(),
    provider: identityProvider("provider"),
    subjectHash: text("subject_hash"), // HMAC dell'email, mai l'email in chiaro
    metadata: jsonb("metadata").notNull().default({}), // niente dati personali né codici
    createdAt: createdAt(),
  },
  (t) => [
    index("auth_events_user_idx").on(t.userId, t.createdAt),
    index("auth_events_type_idx").on(t.type, t.createdAt),
  ],
);

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  branding: jsonb("branding").notNull().default({}),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const venueMembers = pgTable(
  "venue_members",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    role: memberRole("role").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.venueId] }), index("venue_members_venue_idx").on(t.venueId)],
);

export const promotions = pgTable(
  "promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    type: promotionType("type").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").notNull(), // es. { "stampsRequired": 10, "reward": "Caffè gratis" }
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }), // NULL = senza scadenza
    createdAt: createdAt(),
  },
  (t) => [
    unique("promotions_id_venue_uq").on(t.id, t.venueId), // target delle FK composite
    check("promotions_dates_ck", sql`${t.endsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`),
  ],
);

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    venueId: uuid("venue_id").notNull(),
    promotionId: uuid("promotion_id").notNull(),
    stampsCount: integer("stamps_count").notNull().default(0),
    publicCode: text("public_code").notNull().unique(),
    walletProvider: walletProvider("wallet_provider").notNull(),
    walletObjectId: text("wallet_object_id").notNull().unique(),
    walletStatus: walletStatus("wallet_status").notNull().default("not_added"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("cards_user_venue_uq").on(t.userId, t.venueId),
    unique("cards_id_venue_uq").on(t.id, t.venueId),
    foreignKey({ columns: [t.venueId], foreignColumns: [venues.id] }).onDelete("restrict"),
    foreignKey({ columns: [t.promotionId, t.venueId], foreignColumns: [promotions.id, promotions.venueId] }).onDelete(
      "restrict",
    ),
    check("cards_stamps_ck", sql`${t.stampsCount} >= 0`),
  ],
);

export const stampRequests = pgTable(
  "stamp_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id").notNull(),
    venueId: uuid("venue_id").notNull(),
    status: requestStatus("status").notNull().default("pending"),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "restrict" }),
  },
  (t) => [
    unique("stamp_requests_id_venue_uq").on(t.id, t.venueId),
    foreignKey({ columns: [t.cardId, t.venueId], foreignColumns: [cards.id, cards.venueId] }).onDelete("restrict"),
    // una sola richiesta pendente per card
    uniqueIndex("stamp_requests_one_pending_uq")
      .on(t.cardId)
      .where(sql`${t.status} = 'pending'`),
    // coda staff
    index("stamp_requests_queue_idx")
      .on(t.venueId, t.createdAt)
      .where(sql`${t.status} = 'pending'`),
  ],
);

export const stampEvents = pgTable(
  "stamp_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id").notNull(),
    venueId: uuid("venue_id").notNull(),
    promotionId: uuid("promotion_id").notNull(),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // NON unique: una richiesta con più tratti (es. 15 timbri) genera più eventi,
    // uno per tratto. L'unicità è garantita da idempotency_key.
    requestId: uuid("request_id"),
    type: eventType("type").notNull(),
    quantity: integer("quantity").notNull().default(1),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({ columns: [t.cardId, t.venueId], foreignColumns: [cards.id, cards.venueId] }).onDelete("restrict"),
    foreignKey({ columns: [t.promotionId, t.venueId], foreignColumns: [promotions.id, promotions.venueId] }).onDelete(
      "restrict",
    ),
    foreignKey({
      columns: [t.requestId, t.venueId],
      foreignColumns: [stampRequests.id, stampRequests.venueId],
    }).onDelete("restrict"),
    check("stamp_events_qty_ck", sql`${t.quantity} > 0`),
    index("stamp_events_card_idx").on(t.cardId, t.createdAt),
    // gli eventi di una richiesta si leggono per request_id (prima era un UNIQUE)
    index("stamp_events_request_idx").on(t.requestId),
  ],
);

export type Card = typeof cards.$inferSelect;
export type WalletProvider = (typeof walletProvider.enumValues)[number]; // "google" | "apple"
export type WalletStatus = (typeof walletStatus.enumValues)[number]; // "not_added" | "active" | "removed"
export type IdentityProvider = (typeof identityProvider.enumValues)[number]; // "email" | "google"