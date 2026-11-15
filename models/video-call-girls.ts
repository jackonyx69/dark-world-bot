import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const videoCallGirlsTable = pgTable("video_call_girls", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age"),
  imageUrl: text("image_url"),
  serviceStart: text("service_start"),
  serviceEnd: text("service_end"),
  status: text("status").notNull().default("offline"),
  sortOrder: integer("sort_order").notNull().default(0),
  totalFakeCalls: integer("total_fake_calls").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVideoCallGirlSchema = createInsertSchema(videoCallGirlsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVideoCallGirl = z.infer<typeof insertVideoCallGirlSchema>;
export type VideoCallGirl = typeof videoCallGirlsTable.$inferSelect;
