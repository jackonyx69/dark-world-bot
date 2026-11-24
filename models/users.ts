import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  isPremium: boolean("is_premium").notNull().default(false),
  packageType: text("package_type"),
  premiumExpiresAt: timestamp("premium_expires_at", { withTimezone: true }),
  referralCode: text("referral_code").notNull().unique(),
  referralCount: integer("referral_count").notNull().default(0),
  freeDaysEarned: integer("free_days_earned").notNull().default(0),
  referredBy: integer("referred_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
