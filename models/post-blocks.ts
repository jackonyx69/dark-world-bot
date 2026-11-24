import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const postBlocksTable = pgTable("post_blocks", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  blockType: text("block_type").notNull(),
  content: text("content").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPostBlockSchema = createInsertSchema(postBlocksTable).omit({ id: true, createdAt: true });
export type InsertPostBlock = z.infer<typeof insertPostBlockSchema>;
export type PostBlock = typeof postBlocksTable.$inferSelect;
