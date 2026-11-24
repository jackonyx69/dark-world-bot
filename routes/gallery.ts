import { Router, type IRouter } from "express";
import { db, premiumGalleryTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { ListGalleryResponse, GalleryMedia } from "@workspace/api-zod";
import { serialize } from "../utils/serialize";

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

router.get("/gallery", async (_req, res): Promise<void> => {
  const rows = await db.select().from(premiumGalleryTable)
    .where(eq(premiumGalleryTable.isActive, true))
    .orderBy(asc(premiumGalleryTable.sortOrder));
  res.json(ListGalleryResponse.parse(serialize(rows.map(withMedia))));
});

export default router;