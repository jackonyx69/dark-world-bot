import { Router, type IRouter } from "express";
import { db, categoriesTable, postCategoriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  ListAdminCategoriesResponse,
  CreateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryBody,
  UpdateCategoryResponse,
  DeleteCategoryParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middleware/admin-auth";
import { serialize } from "../../utils/serialize";

const router: IRouter = Router();

router.get("/admin/categories", requireAdmin, async (_req, res): Promise<void> => {
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  const withCount = await Promise.all(cats.map(async (c) => {
    const [r] = await db.select({ cnt: sql<number>`count(*)` }).from(postCategoriesTable).where(eq(postCategoriesTable.categoryId, c.id));
    return { ...c, postCount: Number(r.cnt) };
  }));
  res.json(ListAdminCategoriesResponse.parse(serialize(withCount)));
});

router.post("/admin/categories", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const slug = parsed.data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [cat] = await db.insert(categoriesTable).values({ name: parsed.data.name, slug }).returning();
  res.status(201).json({ ...cat, postCount: 0 });
});

router.patch("/admin/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateCategoryParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Partial<typeof categoriesTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) {
    updateData.name = parsed.data.name;
    updateData.slug = parsed.data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
  const [cat] = await db.update(categoriesTable).set(updateData).where(eq(categoriesTable.id, params.data.id)).returning();
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  const [r] = await db.select({ cnt: sql<number>`count(*)` }).from(postCategoriesTable).where(eq(postCategoriesTable.categoryId, cat.id));
  res.json(UpdateCategoryResponse.parse(serialize({ ...cat, postCount: Number(r.cnt) })));
});

router.delete("/admin/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteCategoryParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(postCategoriesTable).where(eq(postCategoriesTable.categoryId, params.data.id));
  const [cat] = await db.delete(categoriesTable).where(eq(categoriesTable.id, params.data.id)).returning();
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  res.sendStatus(204);
});

export default router;
