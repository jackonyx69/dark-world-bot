import { Router, type IRouter } from "express";
import { db, socialLinksTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import {
  ListAdminSocialLinksResponse,
  CreateSocialLinkBody,
  UpdateSocialLinkParams,
  UpdateSocialLinkBody,
  UpdateSocialLinkResponse,
  DeleteSocialLinkParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middleware/admin-auth";
import { serialize } from "../../utils/serialize";

const router: IRouter = Router();

router.get("/admin/social-links", requireAdmin, async (_req, res): Promise<void> => {
  const links = await db.select().from(socialLinksTable).orderBy(asc(socialLinksTable.sortOrder));
  res.json(ListAdminSocialLinksResponse.parse(serialize(links)));
});

router.post("/admin/social-links", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateSocialLinkBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [link] = await db.insert(socialLinksTable).values(parsed.data).returning();
  res.status(201).json(link);
});

router.patch("/admin/social-links/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateSocialLinkParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateSocialLinkBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [link] = await db.update(socialLinksTable).set(parsed.data).where(eq(socialLinksTable.id, params.data.id)).returning();
  if (!link) { res.status(404).json({ error: "Social link not found" }); return; }
  res.json(UpdateSocialLinkResponse.parse(serialize(link)));
});

router.delete("/admin/social-links/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteSocialLinkParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [link] = await db.delete(socialLinksTable).where(eq(socialLinksTable.id, params.data.id)).returning();
  if (!link) { res.status(404).json({ error: "Social link not found" }); return; }
  res.sendStatus(204);
});

export default router;
