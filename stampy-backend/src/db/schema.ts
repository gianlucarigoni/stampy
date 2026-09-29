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

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneCountryCode: text("phone_country_code"), // "39"
    phoneNationalNumber: text("phone_national_number"), // "3331234567"
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    displayName: text("display_name"),
    isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("users_phone_uq").on(t.phoneCountryCode, t.phoneNationalNumber),
    check(
      "users_phone_required",
      sql`${t.anonymizedAt} IS NOT NULL OR (${t.phoneCountryCode} IS NOT NULL AND ${t.phoneNationalNumber} IS NOT NULL)`,
    ),
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
    requestId: uuid("request_id").unique(),
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
  ],
);
