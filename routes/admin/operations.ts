import { Router, type IRouter } from "express";
import {
  db,
  postsTable,
  usersTable,
  pendingPaymentsTable,
  packagesTable,
  paymentMethodsTable,
  categoriesTable,
  socialLinksTable,
  videoCallGirlsTable,
  premiumGalleryTable,
  settingsTable,
  activityLogsTable,
  postBlocksTable,
  postCategoriesTable,
  adminCredentialsTable,
} from "@workspace/db";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { requireAdmin } from "../../middleware/admin-auth";
import { serialize } from "../../utils/serialize";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getTelegramBotToken, getTelegramWebhookSecret } from "../../utils/telegram";
import { logActivity } from "../../utils/activity";

const router: IRouter = Router();
const uploadRoot = path.resolve(
  process.env.UPLOADS_DIR || path.resolve(process.cwd(), "public", "uploads"),
);
let lastCacheClearAt: string | null = null;
const callEvents: Array<{ type: string; girlId: number; telegramId?: string; at: string }> = [];

router.get("/admin/analytics", requireAdmin, async (_req, res): Promise<void> => {
  const [posts] = await db.select({ total: count() }).from(postsTable);
  const [users] = await db.select({ total: count() }).from(usersTable);
  const [views] = await db.select({ total: sql<number>`coalesce(sum(${postsTable.viewCount}), 0)` }).from(postsTable);
  const [likes] = await db.select({ total: sql<number>`coalesce(sum(${postsTable.likeCount}), 0)` }).from(postsTable);
  const [approved] = await db.select({ total: count() }).from(pendingPaymentsTable).where(eq(pendingPaymentsTable.status, "approved"));
  const [revenue] = await db.select({ total: sql<number>`coalesce(sum(cast(${pendingPaymentsTable.amount} as numeric)), 0)` }).from(pendingPaymentsTable).where(eq(pendingPaymentsTable.status, "approved"));
  const [pending] = await db.select({ total: count() }).from(pendingPaymentsTable).where(eq(pendingPaymentsTable.status, "pending"));
  const [premium] = await db.select({ total: count() }).from(usersTable).where(eq(usersTable.isPremium, true));
  const sections = await Promise.all(["home", "free", "paid"].map(async (section) => {
    const [row] = await db.select({ total: count() }).from(postsTable).where(sql`${postsTable.sections} like ${`%${section}%`}`);
    return [section, row.total] as const;
  }));
  res.json({
    totalPosts: posts.total,
    totalUsers: users.total,
    totalViews: Number(views.total),
    totalLikes: Number(likes.total),
    approvedPayments: approved.total,
    pendingPayments: pending.total,
    premiumUsers: premium.total,
    todayVisitors: 0,
    revenue: Number(revenue.total),
    sections: Object.fromEntries(sections),
    cache: { lastClearedAt: lastCacheClearAt },
    webhook: { registeredAt: null },
  });
});

router.post("/admin/upload", requireAdmin, async (req, res): Promise<void> => {
  const { filename, mimeType, data } = req.body ?? {};
  if (typeof filename !== "string" || typeof data !== "string") {
    res.status(400).json({ error: "filename and base64 data are required" });
    return;
  }
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]);
  const cleanMime = typeof mimeType === "string" ? mimeType : "application/octet-stream";
  if (!allowed.has(cleanMime)) {
    res.status(400).json({ error: "Unsupported file type" });
    return;
  }
  const raw = data.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");
  if (buffer.byteLength > 25 * 1024 * 1024) {
    res.status(413).json({ error: "File is larger than 25MB" });
    return;
  }
  const extension = path.extname(filename).toLowerCase() || (cleanMime === "video/mp4" ? ".mp4" : ".bin");
  const safeName = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${extension.replace(/[^a-z0-9.]/g, "")}`;
  await mkdir(uploadRoot, { recursive: true });
  await writeFile(path.join(uploadRoot, safeName), buffer);
  res.status(201).json({ url: `/api/uploads/${safeName}`, filename: safeName, size: buffer.byteLength, mimeType: cleanMime });
});

router.post("/admin/posts/:id/pin", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const isPinned = Boolean(req.body?.isPinned);
  const pinOrder = isPinned ? Math.max(0, Number(req.body?.pinOrder ?? 1)) : null;
  const [post] = await db.update(postsTable).set({ pinOrder }).where(eq(postsTable.id, id)).returning();
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  res.json(serialize(post));
});

router.post("/admin/posts/:id/active", requireAdmin, async (req, res): Promise<void> => {
  const [post] = await db.update(postsTable).set({ isActive: Boolean(req.body?.isActive) }).where(eq(postsTable.id, Number(req.params.id))).returning();
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  res.json(serialize(post));
});

router.post("/admin/cache/clear", requireAdmin, async (_req, res): Promise<void> => {
  lastCacheClearAt = new Date().toISOString();
  res.json({ success: true, clearedAt: lastCacheClearAt });
});

router.post("/admin/webhook/register", requireAdmin, async (req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable);
  if (!settings) [settings] = await db.insert(settingsTable).values({}).returning();
  const botToken = getTelegramBotToken();
  if (!botToken) { res.status(400).json({ error: "Configure TELEGRAM_BOT_TOKEN in .env first" }); return; }
  const rawWebhookUrl = settings.webhookUrl || process.env.TELEGRAM_WEBHOOK_URL;
  if (!rawWebhookUrl) { res.status(400).json({ error: "Set the public HTTPS webhook URL in Settings first" }); return; }
  let webhookUrl: string;
  try {
    const parsedUrl = new URL(rawWebhookUrl);
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, "");
    if (parsedUrl.protocol !== "https:" || !parsedUrl.pathname.endsWith("/api/telegram/webhook")) {
      res.status(400).json({ error: "The webhook URL must be HTTPS and end with /api/telegram/webhook" });
      return;
    }
    parsedUrl.search = "";
    parsedUrl.hash = "";
    webhookUrl = parsedUrl.toString();
  } catch {
    res.status(400).json({ error: "Enter a valid public HTTPS webhook URL" });
    return;
  }

  const webhookSecret = getTelegramWebhookSecret();
  if (!webhookSecret) { res.status(500).json({ error: "Webhook security could not be initialized" }); return; }
  const currentResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const currentResult = await currentResponse.json() as { ok?: boolean; result?: { url?: string } };
  if (!currentResponse.ok || !currentResult.ok) {
    res.status(502).json({ error: "Could not check the current Telegram webhook" });
    return;
  }
  const currentUrl = currentResult.result?.url;
  if (currentUrl && currentUrl !== webhookUrl) {
    res.status(409).json({ error: "This bot already has a different webhook. Remove or verify it before replacing it." });
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ["message"],
    }),
  });
  const result = await response.json() as { ok?: boolean; description?: string };
  if (!response.ok || !result.ok) { res.status(502).json({ error: result.description || "Telegram rejected the webhook" }); return; }
  const registeredAt = new Date();
  await db.update(settingsTable).set({ webhookRegisteredAt: registeredAt }).where(eq(settingsTable.id, settings.id));
  await logActivity({ req, action: "Webhook Registered", statusCode: 200 });
  res.json({ ok: true, registeredAt: registeredAt.toISOString(), description: result.description || "Webhook registered" });
});

router.post("/admin/webhook/remove", requireAdmin, async (req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable);
  if (!settings) [settings] = await db.insert(settingsTable).values({}).returning();
  const botToken = getTelegramBotToken();
  if (!botToken) { res.status(400).json({ error: "Configure TELEGRAM_BOT_TOKEN in .env first" }); return; }
  const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, { method: "POST" });
  const result = await response.json() as { ok?: boolean; description?: string };
  if (!response.ok || !result.ok) { res.status(502).json({ error: result.description || "Telegram rejected webhook removal" }); return; }
  await db.update(settingsTable).set({ webhookRegisteredAt: null }).where(eq(settingsTable.id, settings.id));
  await logActivity({ req, action: "Webhook Removed", statusCode: 200 });
  res.json({ ok: true, description: result.description || "Webhook removed" });
});

router.get("/admin/webhook/status", requireAdmin, async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(settingsTable);
  const botToken = getTelegramBotToken();
  if (!botToken) {
    res.json({ registered: false, url: settings?.webhookUrl ?? null, registeredAt: null, pendingUpdates: 0 });
    return;
  }
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const result = await response.json() as { ok?: boolean; result?: { url?: string; pending_update_count?: number } };
  const info = result.result;
  res.json({
    registered: Boolean(info?.url),
    url: info?.url || settings?.webhookUrl || null,
    registeredAt: settings?.webhookRegisteredAt?.toISOString() || null,
    pendingUpdates: info?.pending_update_count || 0,
  });
});

router.post("/admin/webhook/test-bot", requireAdmin, async (_req, res): Promise<void> => {
  const botToken = getTelegramBotToken();
  if (!botToken) { res.status(400).json({ connected: false, message: "Add TELEGRAM_BOT_TOKEN to Replit Secrets first" }); return; }
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const result = await response.json() as { ok?: boolean; result?: { username?: string }; description?: string };
  res.status(response.ok && result.ok ? 200 : 502).json({
    connected: Boolean(response.ok && result.ok),
    message: result.ok ? `Connected to @${result.result?.username || "configured bot"}` : (result.description || "Bot connection failed"),
  });
});

router.post("/admin/webhook/test-mini-app", requireAdmin, async (_req, res): Promise<void> => {
  const botToken = getTelegramBotToken();
  if (!botToken) {
    res.json({ connected: false, message: "Configure TELEGRAM_BOT_TOKEN in .env first" });
    return;
  }
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const result = await response.json() as { ok?: boolean; result?: { username?: string }; description?: string };
  res.json({
    connected: Boolean(response.ok && result.ok),
    message: result.ok
      ? `Mini App bot connection is ready (@${result.result?.username || "configured bot"})`
      : (result.description || "Mini App bot connection failed"),
  });
});

router.get("/admin/db/status", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const [row] = await db.select({ total: count() }).from(usersTable);
    const version = (await db.execute(sql`select version() as version`)).rows[0] as { version?: string } | undefined;
    const size = (await db.execute(sql`select pg_size_pretty(pg_database_size(current_database())) as size`)).rows[0] as { size?: string } | undefined;
    const connections = (await db.execute(sql`select count(*)::int as total from pg_stat_activity where datname = current_database()`)).rows[0] as { total?: number } | undefined;
    const tables = (await db.execute(sql`select count(*)::int as total from information_schema.tables where table_schema = 'public'`)).rows[0] as { total?: number } | undefined;
    const [settings] = await db.select().from(settingsTable);
    res.json({
      connected: true,
      provider: "postgresql",
      users: row.total,
      checkedAt: new Date().toISOString(),
      version: String(version?.version || "").split(" on ")[0] || null,
      size: String(size?.size || "") || null,
      activeConnections: Number(connections?.total || 0),
      totalTables: Number(tables?.total || 0),
      lastBackupAt: settings?.lastBackupAt?.toISOString() || null,
      postgresEnabled: true,
      mongodb: { enabled: false, connected: false, cluster: null, database: null, message: "Disabled" },
    });
  } catch {
    res.status(503).json({ connected: false, provider: "postgresql", error: "Database is unavailable" });
  }
});

router.post("/admin/db/mongodb/test", requireAdmin, async (_req, res): Promise<void> => {
  res.json({ enabled: false, connected: false, cluster: null, database: null, message: "MongoDB is disabled" });
});

router.get("/admin/backup", requireAdmin, async (req, res): Promise<void> => {
  const [settings] = await db.select().from(settingsTable);
  const snapshot = {
    generatedAt: new Date().toISOString(),
    tables: {
      settings: settings ? [{ ...settings, botToken: getTelegramBotToken() ? "[configured]" : null }] : [],
      users: await db.select().from(usersTable),
      posts: await db.select().from(postsTable),
      postBlocks: await db.select().from(postBlocksTable),
      postCategories: await db.select().from(postCategoriesTable),
      packages: await db.select().from(packagesTable),
      paymentMethods: await db.select().from(paymentMethodsTable),
      payments: await db.select().from(pendingPaymentsTable),
      categories: await db.select().from(categoriesTable),
      socialLinks: await db.select().from(socialLinksTable),
      videoCallGirls: await db.select().from(videoCallGirlsTable),
      gallery: await db.select().from(premiumGalleryTable),
    },
  };
  if (settings) await db.update(settingsTable).set({ lastBackupAt: new Date() }).where(eq(settingsTable.id, settings.id));
  await logActivity({ req, action: "Database Backup Downloaded", statusCode: 200 });
  res.attachment(`dark-would-expose-backup-${Date.now()}.json`).json(serialize(snapshot));
});

router.post("/admin/backup/restore", requireAdmin, async (req, res): Promise<void> => {
  const snapshot = req.body?.backup;
  const tables = snapshot?.tables;
  if (!tables || typeof tables !== "object") { res.status(400).json({ error: "A valid backup with tables is required" }); return; }
  try {
    await db.transaction(async (tx) => {
      const currentSettings = (await tx.select().from(settingsTable))[0];
      const incomingSettings = Array.isArray(tables.settings) ? tables.settings[0] : null;
      if (incomingSettings && currentSettings) {
        const { id: _id, botToken: _ignoredBotToken, updatedAt: _updatedAt, ...rest } = incomingSettings as Record<string, unknown>;
        await tx.update(settingsTable).set(rest as any).where(eq(settingsTable.id, currentSettings.id));
      }
      const restoreRows = async (table: any, rows: unknown) => {
        if (!Array.isArray(rows) || rows.length === 0) return;
        await tx.insert(table).values(rows as any).onConflictDoNothing();
      };
      await restoreRows(usersTable, tables.users);
      await restoreRows(categoriesTable, tables.categories);
      await restoreRows(packagesTable, tables.packages);
      await restoreRows(paymentMethodsTable, tables.paymentMethods);
      await restoreRows(pendingPaymentsTable, tables.payments);
      await restoreRows(postsTable, tables.posts);
      await restoreRows(postBlocksTable, tables.postBlocks);
      await restoreRows(postCategoriesTable, tables.postCategories);
      await restoreRows(socialLinksTable, tables.socialLinks);
      await restoreRows(videoCallGirlsTable, tables.videoCallGirls);
      await restoreRows(premiumGalleryTable, tables.gallery);
    });
    await logActivity({ req, action: "Database Restore", statusCode: 200 });
    res.json({ success: true, description: "Backup data restored without replacing existing rows" });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Backup restore failed" });
  }
});

router.get("/admin/activity", requireAdmin, async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const action = typeof req.query.action === "string" ? req.query.action.trim() : "";
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const filters = [];
  if (search) filters.push(or(ilike(activityLogsTable.action, `%${search}%`), ilike(activityLogsTable.admin, `%${search}%`), ilike(activityLogsTable.ipAddress, `%${search}%`)));
  if (action) filters.push(eq(activityLogsTable.action, action));
  const where = filters.length ? and(...filters) : undefined;
  const rows = await db.select().from(activityLogsTable).where(where).orderBy(desc(activityLogsTable.createdAt)).limit(limit).offset(offset);
  const [total] = await db.select({ total: count() }).from(activityLogsTable).where(where);
  res.json({ items: serialize(rows), total: total.total, limit, offset });
});

router.post("/admin/broadcast", requireAdmin, async (req, res): Promise<void> => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const target = req.body?.target === "channel" ? "channel" : "users";
  if (!message) { res.status(400).json({ error: "Message is required" }); return; }
  const [settings] = await db.select().from(settingsTable);
  const botToken = getTelegramBotToken();
  if (!botToken) { res.status(400).json({ error: "Configure TELEGRAM_BOT_TOKEN in .env first" }); return; }
  const recipients = target === "channel"
    ? [settings?.chatId].filter(Boolean) as string[]
    : (await db.select({ telegramId: usersTable.telegramId }).from(usersTable)).map((u) => u.telegramId);
  let sent = 0;
  let failed = 0;
  for (const chatId of recipients) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
      });
      if (response.ok) sent++; else failed++;
    } catch { failed++; }
  }
  res.json({ target, attempted: recipients.length, sent, failed });
});

router.post("/video-call/start", async (req, res): Promise<void> => {
  const girlId = Number(req.body?.girlId);
  const telegramId = typeof req.body?.telegramId === "string" ? req.body.telegramId : "";
  if (!Number.isInteger(girlId) || girlId <= 0) {
    res.status(400).json({ error: "girlId is required" });
    return;
  }
  if (!telegramId) {
    res.status(403).json({ error: "A registered Telegram user is required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  if (!user || !user.isPremium || !user.premiumExpiresAt || user.premiumExpiresAt <= new Date()) {
    res.status(403).json({ error: "Premium access is required for video calls" });
    return;
  }
  const [pkg] = await db.select().from(packagesTable).where(
    and(eq(packagesTable.name, user.packageType ?? ""), eq(packagesTable.isActive, true)),
  );
  if (!pkg?.videoCallAccess) {
    res.status(403).json({ error: "Your package does not include video calls" });
    return;
  }
  const [girl] = await db.select({ id: videoCallGirlsTable.id })
    .from(videoCallGirlsTable)
    .where(and(eq(videoCallGirlsTable.id, girlId), eq(videoCallGirlsTable.isActive, true)));
  if (!girl) {
    res.status(404).json({ error: "Video call profile not found" });
    return;
  }
  callEvents.push({ type: "start", girlId, telegramId, at: new Date().toISOString() });
  if (callEvents.length > 50) callEvents.shift();
  await db.update(videoCallGirlsTable)
    .set({ totalFakeCalls: sql`${videoCallGirlsTable.totalFakeCalls} + 1` })
    .where(eq(videoCallGirlsTable.id, girlId));
  res.json({ success: true });
});

router.post("/video-call/end", async (req, res): Promise<void> => {
  const girlId = Number(req.body?.girlId);
  if (!Number.isInteger(girlId) || girlId <= 0) {
    res.status(400).json({ error: "girlId is required" });
    return;
  }
  callEvents.push({ type: "end", girlId, telegramId: req.body?.telegramId, at: new Date().toISOString() });
  if (callEvents.length > 50) callEvents.shift();
  res.json({ success: true });
});

export default router;