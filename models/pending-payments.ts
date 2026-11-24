import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pendingPaymentsTable = pgTable("pending_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  packageId: integer("package_id").notNull(),
  amount: text("amount").notNull(),
  currency: text("currency").notNull().default("BDT"),
  status: text("status").notNull().default("pending"),
  transactionId: text("transaction_id"),
  userName: text("user_name"),
  senderNumber: text("sender_number"),
  proofImageUrl: text("proof_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPendingPaymentSchema = createInsertSchema(pendingPaymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPendingPayment = z.infer<typeof insertPendingPaymentSchema>;
export type PendingPayment = typeof pendingPaymentsTable.$inferSelect;
