import { Router, type IRouter } from "express";
import { db, pendingPaymentsTable, usersTable, packagesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  ListPendingPaymentsQueryParams,
  ListPendingPaymentsResponse,
  UpdatePendingPaymentParams,
  UpdatePendingPaymentBody,
  UpdatePendingPaymentResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middleware/admin-auth";
import { serialize } from "../../utils/serialize";
import { sendTelegramMessage } from "../../utils/telegram";

const router: IRouter = Router();

router.get("/admin/pending-payments", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ListPendingPaymentsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  let payments = await db.select().from(pendingPaymentsTable).orderBy(sql`${pendingPaymentsTable.createdAt} DESC`);
  if (parsed.data.status) {
    payments = payments.filter(p => p.status === parsed.data.status);
  }

  const enriched = await Promise.all(payments.map(async (p) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, p.userId));
    const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, p.packageId));
    return { ...p, user: user ?? null, package: pkg ?? null };
  }));

  res.json(ListPendingPaymentsResponse.parse(serialize(enriched)));
});

router.patch("/admin/pending-payments/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePendingPaymentParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePendingPaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [current] = await db.select().from(pendingPaymentsTable).where(eq(pendingPaymentsTable.id, params.data.id));
  if (!current) { res.status(404).json({ error: "Payment not found" }); return; }
  if (!["pending", "approved", "rejected"].includes(parsed.data.status)) {
    res.status(400).json({ error: "Invalid payment status" });
    return;
  }
  if (current.status !== "pending" && current.status !== parsed.data.status) {
    res.status(409).json({ error: "Payment status has already been finalized" });
    return;
  }
  const [payment] = current.status === parsed.data.status
    ? [current]
    : await db.update(pendingPaymentsTable)
      .set({ status: parsed.data.status })
      .where(eq(pendingPaymentsTable.id, params.data.id))
      .returning();
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payment.userId));
  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, payment.packageId));

  if (current.status === "pending" && parsed.data.status === "approved" && pkg) {
    const durationMs = pkg.duration * (pkg.durationUnit === "months" ? 30 : 1) * 24 * 60 * 60 * 1000;
    const baseTime = user?.premiumExpiresAt && user.premiumExpiresAt.getTime() > Date.now()
      ? user.premiumExpiresAt.getTime()
      : Date.now();
    const expiresAt = new Date(baseTime + durationMs);
    await db.update(usersTable).set({
      isPremium: true,
      packageType: pkg.name.toLowerCase(),
      premiumExpiresAt: expiresAt,
    }).where(eq(usersTable.id, payment.userId));
  }

  if (current.status === "pending" && parsed.data.status !== "pending") {
    const statusLabel = parsed.data.status === "approved" ? "approved" : "rejected";
    await sendTelegramMessage(
      user?.telegramId,
      `Payment <b>${statusLabel}</b>\nPackage: ${pkg?.name ?? "Unknown"}\nTransaction: <code>${payment.transactionId ?? "N/A"}</code>`,
    );
  }
  res.json(UpdatePendingPaymentResponse.parse(serialize({ ...payment, user: user ?? null, package: pkg ?? null })));
});

export default router;
