import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const premiumGalleryTable = pgTable("premium_gallery", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  medias: text("medias").notNull().default("[]"),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPremiumGallerySchema = createInsertSchema(premiumGalleryTable).omit({
  id: true,
  viewCount: true,
  likeCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPremiumGallery = z.infer<typeof insertPremiumGallerySchema>;
export type PremiumGallery = typeof premiumGalleryTable.$inferSelect;