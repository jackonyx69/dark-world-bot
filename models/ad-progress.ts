import { pgTable, serial, boolean, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adProgressTable = pgTable("ad_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  postId: integer("post_id").notNull(),
  watchedAds: integer("watched_ads").notNull().default(0),
  isUnlocked: boolean("is_unlocked").notNull().default(false),
  lastAdWatchedAt: timestamp("last_ad_watched_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAdProgressSchema = createInsertSchema(adProgressTable).omit({ id: true });
export type InsertAdProgress = z.infer<typeof insertAdProgressSchema>;
export type AdProgress = typeof adProgressTable.$inferSelect;
