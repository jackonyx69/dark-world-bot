import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adSettingsTable = pgTable("ad_settings", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  hideForPremium: boolean("hide_for_premium").notNull().default(true),
  
  // Scripts (Popunder, In-Page Push, MultiTag, etc.)
  headerScript: text("header_script"),
  popunderScript: text("popunder_script"),
  
  // Banners
  topBanner: text("top_banner"),
  topBannerEnabled: boolean("top_banner_enabled").notNull().default(true),
  
  bottomBanner: text("bottom_banner"),
  bottomBannerEnabled: boolean("bottom_banner_enabled").notNull().default(true),
  
  feedBanner: text("feed_banner"),
  feedBannerEnabled: boolean("feed_banner_enabled").notNull().default(true),
  
  // Monetag & Direct Links
  monetagZoneId: text("monetag_zone_id"),
  directLinkUrl: text("direct_link_url"),
  
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAdSettingsSchema = createInsertSchema(adSettingsTable).omit({ id: true });
export type InsertAdSettings = z.infer<typeof insertAdSettingsSchema>;
export type AdSettings = typeof adSettingsTable.$inferSelect;
