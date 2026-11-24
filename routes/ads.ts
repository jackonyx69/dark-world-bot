import { Router, type IRouter } from "express";
import { db, adSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/admin-auth";
import { serialize } from "../utils/serialize";
import { memoryCache } from "../utils/cache";
import { logActivity } from "../utils/activity";

const router: IRouter = Router();

async function getOrCreateAdSettings() {
  let [settings] = await db.select().from(adSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(adSettingsTable).values({}).returning();
  }
  return settings;
}

// Public: Get active ad configuration for user application
router.get("/ads", async (_req, res): Promise<void> => {
  try {
    const cached = memoryCache.get<any>("public:ads");
    if (cached) {
      res.json(cached);
      return;
    }
    const settings = await getOrCreateAdSettings();
    const serialized = serialize(settings);
    memoryCache.set("public:ads", serialized, 60);
    res.json(serialized);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ad settings" });
  }
});

// Admin: Get ad settings
router.get("/admin/ads", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const settings = await getOrCreateAdSettings();
    res.json(serialize(settings));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin ad settings" });
  }
});

// Admin: Update ad settings (PUT & PATCH)
async function updateAdSettings(req: any, res: any): Promise<void> {
  try {
    const current = await getOrCreateAdSettings();
    const body = req.body || {};

    const updateData: Partial<typeof adSettingsTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.enabled !== undefined) updateData.enabled = Boolean(body.enabled);
    if (body.hideForPremium !== undefined) updateData.hideForPremium = Boolean(body.hideForPremium);

    if (body.headerScript !== undefined) updateData.headerScript = typeof body.headerScript === "string" ? body.headerScript : null;
    if (body.popunderScript !== undefined) updateData.popunderScript = typeof body.popunderScript === "string" ? body.popunderScript : null;

    if (body.topBanner !== undefined) updateData.topBanner = typeof body.topBanner === "string" ? body.topBanner : null;
    if (body.topBannerEnabled !== undefined) updateData.topBannerEnabled = Boolean(body.topBannerEnabled);

    if (body.bottomBanner !== undefined) updateData.bottomBanner = typeof body.bottomBanner === "string" ? body.bottomBanner : null;
    if (body.bottomBannerEnabled !== undefined) updateData.bottomBannerEnabled = Boolean(body.bottomBannerEnabled);

    if (body.feedBanner !== undefined) updateData.feedBanner = typeof body.feedBanner === "string" ? body.feedBanner : null;
    if (body.feedBannerEnabled !== undefined) updateData.feedBannerEnabled = Boolean(body.feedBannerEnabled);

    if (body.monetagZoneId !== undefined) updateData.monetagZoneId = typeof body.monetagZoneId === "string" ? body.monetagZoneId.trim() : null;
    if (body.directLinkUrl !== undefined) updateData.directLinkUrl = typeof body.directLinkUrl === "string" ? body.directLinkUrl.trim() : null;

    const [updated] = await db
      .update(adSettingsTable)
      .set(updateData)
      .where(eq(adSettingsTable.id, current.id))
      .returning();

    await logActivity({ req, action: "Ad Settings Updated", statusCode: 200 });
    memoryCache.delete("public:ads");
    res.json(serialize(updated));
  } catch (error) {
    res.status(500).json({ error: "Failed to update ad settings" });
  }
}

router.put("/admin/ads", requireAdmin, updateAdSettings);
router.patch("/admin/ads", requireAdmin, updateAdSettings);

export default router;
