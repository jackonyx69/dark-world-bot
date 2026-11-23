import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  admin: text("admin").notNull().default("admin"),
  ipAddress: text("ip_address"),
  method: text("method"),
  path: text("path"),
  statusCode: text("status_code"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityLog = typeof activityLogsTable.$inferSelect;