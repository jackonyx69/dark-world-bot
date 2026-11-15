import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const postCategoriesTable = pgTable("post_categories", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  categoryId: integer("category_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
