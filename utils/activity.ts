import type { Request } from "express";
import { db, activityLogsTable } from "@workspace/db";

export async function logActivity(input: {
  req?: Request;
  action: string;
  statusCode?: number;
  details?: string;
  admin?: string;
}): Promise<void> {
  try {
    const req = input.req;
    const forwarded = req?.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req?.ip;
    await db.insert(activityLogsTable).values({
      action: input.action,
      admin: input.admin ?? "admin",
      ipAddress: ip ?? null,
      method: req?.method ?? null,
      path: req?.path ?? null,
      statusCode: input.statusCode ? String(input.statusCode) : null,
      details: input.details ?? null,
    });
  } catch {
    // Activity logging must never interrupt the requested admin operation.
  }
}