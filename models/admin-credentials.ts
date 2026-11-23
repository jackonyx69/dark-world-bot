import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const adminCredentialsTable = pgTable("admin_credentials", {
  id: serial("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminCredential = typeof adminCredentialsTable.$inferSelect;