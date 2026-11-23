import { Router, type IRouter } from "express";
import { db, pendingPaymentsTable, packagesTable, paymentMethodsTable, videoCallGirlsTable, socialLinksTable, usersTable } from "@workspace/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import { serialize } from "../utils/serialize";
import {
  SubmitPaymentBody,
  ListPaymentMethodsResponse,
  ListPackagesResponse,
  ListVideoCallGirlsResponse,
  ListSocialLinksResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/packages", async (_req, res): Promise<void> => {
  const pkgs = await db.select().from(packagesTable).where(eq(packagesTable.isActive, true)).orderBy(asc(packagesTable.sortOrder));
  res.json(ListPackagesResponse.parse(serialize(pkgs)));
});

router.get("/payment-methods", async (_req, res): Promise<void> => {
  const methods = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.isActive, true)).orderBy(asc(paymentMethodsTable.sortOrder));
  res.json(ListPaymentMethodsResponse.parse(serialize(methods)));
});

router.get("/video-call-girls", async (_req, res): Promise<void> => {
  const list = await db.select().from(videoCallGirlsTable).where(eq(videoCallGirlsTable.isActive, true)).orderBy(asc(videoCallGirlsTable.sortOrder));
  res.json(ListVideoCallGirlsResponse.parse(serialize(list)));
});

router.get("/social-links", async (_req, res): Promise<void> => {
  const list = await db.select().from(socialLinksTable).where(eq(socialLinksTable.isActive, true)).orderBy(asc(socialLinksTable.sortOrder));
  res.json(ListSocialLinksResponse.parse(serialize(list)));
});

router.post("/payments/submit", async (req, res): Promise<void> => {
  const parsed = SubmitPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.userId));
  if (!user) {
    res.status(400).json({ error: "User not found" });
    return;
  }
  const [pkg] = await db.select().from(packagesTable).where(
    and(eq(packagesTable.id, parsed.data.packageId), eq(packagesTable.isActive, true)),
  );
  if (!pkg) {
    res.status(400).json({ error: "Package is unavailable" });
    return;
  }

  const transactionId = parsed.data.transactionId.trim();
  if (!transactionId) {
    res.status(400).json({ error: "Transaction ID is required" });
    return;
  }
  const [duplicate] = await db.select({ id: pendingPaymentsTable.id, status: pendingPaymentsTable.status })
    .from(pendingPaymentsTable)
    .where(and(
      eq(pendingPaymentsTable.transactionId, transactionId),
      inArray(pendingPaymentsTable.status, ["pending", "approved"]),
    ));
  if (duplicate) {
    res.status(409).json({ error: "This transaction ID has already been submitted" });
    return;
  }

  const [payment] = await db.insert(pendingPaymentsTable).values({
    userId: parsed.data.userId,
    packageId: parsed.data.packageId,
    amount: parsed.data.amount,
    transactionId,
    userName: parsed.data.userName,
    senderNumber: parsed.data.senderNumber,
    proofImageUrl: parsed.data.paymentProof,
    status: "pending",
  }).returning();

  res.status(201).json(payment);
});

export default router;
