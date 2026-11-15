import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  botToken: text("bot_token"),
  chatId: text("chat_id"),
  premiumGroupLink: text("premium_group_link"),
  siteName: text("site_name").notNull().default("Dark Would Expose"),
  siteLogo: text("site_logo"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  channelLink: text("channel_link"),
  groupLink: text("group_link"),
  supportLink: text("support_link"),
  telegramUsername: text("telegram_username"),
  enableNotice: boolean("enable_notice").notNull().default(false),
  noticeText: text("notice_text"),
  paymentInstructions: text("payment_instructions"),
  enableReferral: boolean("enable_referral").notNull().default(true),
  postgresEnabled: boolean("postgres_enabled").notNull().default(true),
  mongodbEnabled: boolean("mongodb_enabled").notNull().default(false),
  mongodbUri: text("mongodb_uri"),
  mongodbDatabaseName: text("mongodb_database_name"),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  maintenanceMessage: text("maintenance_message"),
  faviconUrl: text("favicon_url"),
  webhookUrl: text("webhook_url"),
  webhookRegisteredAt: timestamp("webhook_registered_at", { withTimezone: true }),
  lastBackupAt: timestamp("last_backup_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
