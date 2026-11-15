import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const adSessionsTable = pgTable("ad_sessions", {
  id: serial("id").primaryKey(),
  ymid: text("ymid").notNull().unique(),
  userId: text("user_id").notNull(),
  postId: integer("post_id").notNull(),
  zoneId: text("zone_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  rewardedAt: timestamp("rewarded_at", { withTimezone: true }),
});

export type AdSession = typeof adSessionsTable.$inferSelect;
