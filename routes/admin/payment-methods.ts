import { Router, type IRouter } from "express";
import { db, paymentMethodsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import {
  ListAdminPaymentMethodsResponse,
  CreatePaymentMethodBody,
  UpdatePaymentMethodParams,
  UpdatePaymentMethodBody,
  UpdatePaymentMethodResponse,
  DeletePaymentMethodParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middleware/admin-auth";
import { serialize } from "../../utils/serialize";

const router: IRouter = Router();

router.get("/admin/payment-methods", requireAdmin, async (_req, res): Promise<void> => {
  const methods = await db.select().from(paymentMethodsTable).orderBy(asc(paymentMethodsTable.sortOrder));
  res.json(ListAdminPaymentMethodsResponse.parse(serialize(methods)));
});

router.post("/admin/payment-methods", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreatePaymentMethodBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [m] = await db.insert(paymentMethodsTable).values(parsed.data).returning();
  res.status(201).json(m);
});

router.patch("/admin/payment-methods/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePaymentMethodParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePaymentMethodBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [m] = await db.update(paymentMethodsTable).set(parsed.data).where(eq(paymentMethodsTable.id, params.data.id)).returning();
  if (!m) { res.status(404).json({ error: "Payment method not found" }); return; }
  res.json(UpdatePaymentMethodResponse.parse(serialize(m)));
});

router.delete("/admin/payment-methods/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePaymentMethodParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [m] = await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, params.data.id)).returning();
  if (!m) { res.status(404).json({ error: "Payment method not found" }); return; }
  res.sendStatus(204);
});

export default router;
