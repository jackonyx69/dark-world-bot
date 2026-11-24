import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const referralSettingsTable = pgTable("referral_settings", {
  id: serial("id").primaryKey(),
  friendsCount: integer("friends_count").notNull(),
  freeDays: integer("free_days").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReferralSettingSchema = createInsertSchema(referralSettingsTable).omit({ id: true, createdAt: true });
export type InsertReferralSetting = z.infer<typeof insertReferralSettingSchema>;
export type ReferralSetting = typeof referralSettingsTable.$inferSelect;
