import { Router, type IRouter } from "express";
import { db, packagesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import {
  ListAdminPackagesResponse,
  CreatePackageBody,
  UpdatePackageParams,
  UpdatePackageBody,
  UpdatePackageResponse,
  DeletePackageParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middleware/admin-auth";
import { serialize } from "../../utils/serialize";

const router: IRouter = Router();

router.get("/admin/packages", requireAdmin, async (_req, res): Promise<void> => {
  const pkgs = await db.select().from(packagesTable).orderBy(asc(packagesTable.sortOrder));
  res.json(ListAdminPackagesResponse.parse(serialize(pkgs)));
});

router.post("/admin/packages", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreatePackageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [pkg] = await db.insert(packagesTable).values(parsed.data).returning();
  res.status(201).json(pkg);
});

router.patch("/admin/packages/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePackageParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePackageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [pkg] = await db.update(packagesTable).set(parsed.data).where(eq(packagesTable.id, params.data.id)).returning();
  if (!pkg) { res.status(404).json({ error: "Package not found" }); return; }
  res.json(UpdatePackageResponse.parse(serialize(pkg)));
});

router.delete("/admin/packages/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePackageParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [pkg] = await db.delete(packagesTable).where(eq(packagesTable.id, params.data.id)).returning();
  if (!pkg) { res.status(404).json({ error: "Package not found" }); return; }
  res.sendStatus(204);
});

export default router;
