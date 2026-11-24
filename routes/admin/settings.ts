import { Router, type IRouter } from "express";
import { db, settingsTable, referralSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
  GetPublicSettingsResponse,
  ListReferralSettingsResponse,
  CreateReferralSettingBody,
  DeleteReferralSettingParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middleware/admin-auth";
import { serialize } from "../../utils/serialize";
import { memoryCache } from "../../utils/cache";
import { logActivity } from "../../utils/activity";
import { getTelegramBotToken } from "../../utils/telegram";

const router: IRouter = Router();

function serializeAdminSettings(settings: typeof settingsTable.$inferSelect) {
  return {
    ...(serialize(settings) as Record<string, unknown>),
    botToken: getTelegramBotToken() ? "[configured]" : null,
  };
}

router.get("/settings", async (_req, res): Promise<void> => {
  const cached = memoryCache.get<any>("public:settings");
  if (cached) {
    res.json(cached);
    return;
  }
  let [settings] = await db.select().from(settingsTable);
  if (!settings) {
    [settings] = await db.insert(settingsTable).values({}).returning();
  }
  const serialized = GetPublicSettingsResponse.parse(serialize({
    siteName: settings.siteName,
    siteLogo: settings.siteLogo,
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    premiumGroupLink: settings.premiumGroupLink,
    channelLink: settings.channelLink,
    groupLink: settings.groupLink,
    supportLink: settings.supportLink,
    telegramUsername: settings.telegramUsername,
     paymentInstructions: settings.paymentInstructions,
    enableNotice: settings.enableNotice,
    noticeText: settings.noticeText,
     maintenanceMode: settings.maintenanceMode,
     maintenanceMessage: settings.maintenanceMessage,
     faviconUrl: settings.faviconUrl,
     watermarkText: settings.watermarkText,
     enableWatermark: settings.enableWatermark,
  }));
  memoryCache.set("public:settings", serialized, 60);
  res.json(serialized);
});

router.get("/referral-settings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(referralSettingsTable).orderBy(referralSettingsTable.friendsCount);
  res.json(ListReferralSettingsResponse.parse(serialize(rows)));
});

async function getAdminSettings(_req: any, res: any): Promise<void> {
  let [settings] = await db.select().from(settingsTable);
  if (!settings) {
    [settings] = await db.insert(settingsTable).values({}).returning();
  }
  res.json(GetSettingsResponse.parse(serializeAdminSettings(settings)));
}

async function updateAdminSettings(req: any, res: any): Promise<void> {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (parsed.data.botToken && parsed.data.botToken !== "[configured]") {
    res.status(400).json({ error: "Store the Telegram bot token in .env as TELEGRAM_BOT_TOKEN." });
    return;
  }
  let [settings] = await db.select().from(settingsTable);
  if (!settings) {
    [settings] = await db.insert(settingsTable).values({}).returning();
  }
  const updateData: Partial<typeof settingsTable.$inferInsert> = {};
  if (parsed.data.chatId !== undefined) updateData.chatId = parsed.data.chatId;
  if (parsed.data.premiumGroupLink !== undefined) updateData.premiumGroupLink = parsed.data.premiumGroupLink;
  if (parsed.data.enableReferral !== undefined) updateData.enableReferral = parsed.data.enableReferral;
   for (const key of [
     "postgresEnabled", "mongodbEnabled", "mongodbUri", "mongodbDatabaseName",
     "maintenanceMode", "maintenanceMessage", "faviconUrl", "webhookUrl",
     "watermarkText", "enableWatermark",
   ] as const) {
     const value = parsed.data[key];
     if (value !== undefined) {
       (updateData as Record<string, unknown>)[key] = typeof value === "string" ? (value || null) : value;
     }
   }
  for (const key of [
    "siteName", "siteLogo", "primaryColor", "secondaryColor",
    "channelLink", "groupLink", "supportLink", "noticeText",
    "telegramUsername",
     "paymentInstructions",
  ] as const) {
    const value = parsed.data[key];
    if (value !== undefined) {
      (updateData as Record<string, unknown>)[key] = value || null;
    }
  }
  if (parsed.data.enableNotice !== undefined) updateData.enableNotice = parsed.data.enableNotice;
  const [updated] = await db.update(settingsTable).set(updateData).where(eq(settingsTable.id, settings.id)).returning();
  memoryCache.delete("public:settings");
  await logActivity({ req, action: "Settings Changed", statusCode: 200 });
  res.json(UpdateSettingsResponse.parse(serializeAdminSettings(updated)));
}

router.get("/admin/settings", requireAdmin, getAdminSettings);
router.put("/admin/settings", requireAdmin, updateAdminSettings);
router.patch("/admin/settings", requireAdmin, updateAdminSettings);

router.get("/admin/settings/export", requireAdmin, async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable);
  if (!settings) [settings] = await db.insert(settingsTable).values({}).returning();
  const serializedSettings = serialize(settings) as Record<string, unknown>;
  res.json({
    exportedAt: new Date().toISOString(),
    settings: {
      ...serializedSettings,
      botToken: getTelegramBotToken() ? "[configured]" : null,
    },
  });
});

router.post("/admin/settings/import", requireAdmin, async (req, res): Promise<void> => {
  const incoming = req.body?.settings;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    res.status(400).json({ error: "A settings object is required" });
    return;
  }
  let [settings] = await db.select().from(settingsTable);
  if (!settings) [settings] = await db.insert(settingsTable).values({}).returning();
  const allowed = [
    "chatId", "premiumGroupLink", "siteName", "siteLogo", "primaryColor",
    "secondaryColor", "channelLink", "groupLink", "supportLink", "telegramUsername",
    "enableNotice", "noticeText", "enableReferral", "postgresEnabled", "mongodbEnabled",
    "mongodbUri", "mongodbDatabaseName", "maintenanceMode", "maintenanceMessage",
     "faviconUrl", "webhookUrl", "paymentInstructions",
  ] as const;
  const updateData: Record<string, unknown> = {};
  for (const key of allowed) {
    if (incoming[key] === undefined || incoming[key] === "[configured]") continue;
    updateData[key] = typeof incoming[key] === "string" && incoming[key] === "" ? null : incoming[key];
  }
  const [updated] = await db.update(settingsTable).set(updateData as any).where(eq(settingsTable.id, settings.id)).returning();
  await logActivity({ req, action: "Settings Imported", statusCode: 200 });
  res.json(UpdateSettingsResponse.parse(serializeAdminSettings(updated)));
});

router.post("/admin/settings/reset", requireAdmin, async (req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable);
  if (!settings) [settings] = await db.insert(settingsTable).values({}).returning();
  const [updated] = await db.update(settingsTable).set({
    chatId: null,
    premiumGroupLink: null,
    siteName: "Dark Would Expose",
    siteLogo: null,
    primaryColor: null,
    secondaryColor: null,
    channelLink: null,
    groupLink: null,
    supportLink: null,
    telegramUsername: null,
    enableNotice: false,
    noticeText: null,
    enableReferral: true,
    postgresEnabled: true,
    mongodbEnabled: false,
    mongodbUri: null,
    mongodbDatabaseName: null,
    maintenanceMode: false,
    maintenanceMessage: null,
    faviconUrl: null,
    webhookUrl: null,
     paymentInstructions: null,
    webhookRegisteredAt: null,
  }).where(eq(settingsTable.id, settings.id)).returning();
  await logActivity({ req, action: "Settings Reset", statusCode: 200 });
  res.json(UpdateSettingsResponse.parse(serializeAdminSettings(updated)));
});

router.get("/admin/referral-settings", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(referralSettingsTable).orderBy(referralSettingsTable.friendsCount);
  res.json(ListReferralSettingsResponse.parse(serialize(rows)));
});

router.post("/admin/referral-settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateReferralSettingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(referralSettingsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.delete("/admin/referral-settings/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteReferralSettingParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(referralSettingsTable).where(eq(referralSettingsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
