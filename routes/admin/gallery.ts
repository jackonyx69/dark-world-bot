import { Router, type IRouter } from "express";
import { db, premiumGalleryTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import {
  ListAdminGalleryResponse,
  CreateGalleryItemBody,
  UpdateGalleryItemParams,
  UpdateGalleryItemBody,
  UpdateGalleryItemResponse,
  DeleteGalleryItemParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middleware/admin-auth";
import { serialize } from "../../utils/serialize";

const router: IRouter = Router();

function withMedia(item: typeof premiumGalleryTable.$inferSelect) {
  let medias: unknown[] = [];
  try {
    medias = JSON.parse(item.medias || "[]");
  } catch {
    medias = [];
  }
  return { ...item, medias };
}

router.get("/admin/gallery", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(premiumGalleryTable).orderBy(asc(premiumGalleryTable.sortOrder));
  res.json(ListAdminGalleryResponse.parse(serialize(rows.map(withMedia))));
});

router.post("/admin/gallery", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateGalleryItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(premiumGalleryTable).values({
    title: parsed.data.title,
    description: parsed.data.description,
    medias: JSON.stringify(parsed.data.medias),
    sortOrder: parsed.data.sortOrder ?? 0,
    isActive: parsed.data.isActive ?? true,
  }).returning();
  res.status(201).json(UpdateGalleryItemResponse.parse(serialize(withMedia(row))));
});

router.patch("/admin/gallery/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateGalleryItemParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateGalleryItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Partial<typeof premiumGalleryTable.$inferInsert> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.medias !== undefined) updateData.medias = JSON.stringify(parsed.data.medias);
  if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
  const [row] = await db.update(premiumGalleryTable).set(updateData)
    .where(eq(premiumGalleryTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Gallery item not found" }); return; }
  res.json(UpdateGalleryItemResponse.parse(serialize(withMedia(row))));
});

router.delete("/admin/gallery/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteGalleryItemParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(premiumGalleryTable)
    .where(eq(premiumGalleryTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Gallery item not found" }); return; }
  res.sendStatus(204);
});

export default router;