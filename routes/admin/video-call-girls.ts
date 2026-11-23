import { Router, type IRouter } from "express";
import { db, videoCallGirlsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import {
  ListAdminVideoCallGirlsResponse,
  CreateVideoCallGirlBody,
  UpdateVideoCallGirlParams,
  UpdateVideoCallGirlBody,
  UpdateVideoCallGirlResponse,
  DeleteVideoCallGirlParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middleware/admin-auth";
import { serialize } from "../../utils/serialize";

const router: IRouter = Router();

router.get("/admin/video-call-girls", requireAdmin, async (_req, res): Promise<void> => {
  const girls = await db.select().from(videoCallGirlsTable).orderBy(asc(videoCallGirlsTable.sortOrder));
  res.json(ListAdminVideoCallGirlsResponse.parse(serialize(girls)));
});

router.post("/admin/video-call-girls", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateVideoCallGirlBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [girl] = await db.insert(videoCallGirlsTable).values(parsed.data).returning();
  res.status(201).json(girl);
});

router.patch("/admin/video-call-girls/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateVideoCallGirlParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateVideoCallGirlBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [girl] = await db.update(videoCallGirlsTable).set(parsed.data).where(eq(videoCallGirlsTable.id, params.data.id)).returning();
  if (!girl) { res.status(404).json({ error: "Not found" }); return; }
  res.json(UpdateVideoCallGirlResponse.parse(serialize(girl)));
});

router.delete("/admin/video-call-girls/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteVideoCallGirlParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [girl] = await db.delete(videoCallGirlsTable).where(eq(videoCallGirlsTable.id, params.data.id)).returning();
  if (!girl) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
