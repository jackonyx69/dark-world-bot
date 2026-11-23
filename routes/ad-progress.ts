import { Router, type IRouter } from "express";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { db, adProgressTable, adSessionsTable, postsTable, adSettingsTable } from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  GetAdProgressQueryParams,
  GetAdProgressResponse,
  CreateAdSessionBody,
  CreateAdSessionResponse,
} from "@workspace/api-zod";
import { verifyTelegramWebAppInitData } from "../utils/telegram";

const router: IRouter = Router();
const unlockDurationMs = 24 * 60 * 60 * 1000;
const postbackSessionLifetimeMs = 48 * 60 * 60 * 1000;

function getQueryString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function secretMatches(supplied: string, expected: string): boolean {
  const suppliedBytes = Buffer.from(supplied, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

function isProgressUnlocked(progress: typeof adProgressTable.$inferSelect | undefined, now: Date): boolean {
  return Boolean(
    progress?.isUnlocked &&
    progress.lastAdWatchedAt &&
    now.getTime() - progress.lastAdWatchedAt.getTime() < unlockDurationMs
  );
}

router.get("/ad-progress", async (req, res): Promise<void> => {
  const parsed = GetAdProgressQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const telegramUser = verifyTelegramWebAppInitData(req.get("X-Telegram-Init-Data"));
  if (!telegramUser) { res.status(401).json({ error: "Open this Mini App from Telegram to check ad access." }); return; }

  const [progress] = await db.select().from(adProgressTable).where(
    and(eq(adProgressTable.postId, parsed.data.postId), eq(adProgressTable.userId, telegramUser.id))
  );
  const unlocked = isProgressUnlocked(progress, new Date());
  res.json(GetAdProgressResponse.parse({
    id: progress?.id,
    userId: telegramUser.id,
    postId: parsed.data.postId,
    watchedAds: unlocked || (progress?.lastAdWatchedAt && Date.now() - progress.lastAdWatchedAt.getTime() < unlockDurationMs)
      ? progress?.watchedAds ?? 0
      : 0,
    isUnlocked: unlocked,
    lastAdWatchedAt: progress?.lastAdWatchedAt?.toISOString() ?? null,
  }));
});

router.post("/ad-progress/session", async (req, res): Promise<void> => {
  const parsed = CreateAdSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const telegramUser = verifyTelegramWebAppInitData(req.get("X-Telegram-Init-Data"));
  if (!telegramUser) { res.status(401).json({ error: "Open this Mini App from Telegram to start an ad." }); return; }

  const { postId } = parsed.data;
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post || !post.isActive) { res.status(404).json({ error: "Post not found." }); return; }
  if (post.accessType !== "ads") { res.status(400).json({ error: "This post does not use ad unlocks." }); return; }

  const [adSettings] = await db.select().from(adSettingsTable).limit(1);
  const zoneId = post.monetagZoneId?.trim() || adSettings?.monetagZoneId?.trim();
  if (!zoneId || !/^\d+$/.test(zoneId)) {
    res.status(503).json({ error: "Missing Monetag zone ID. Please configure it in Ads Setup or post settings." });
    return;
  }

  const [progress] = await db.select().from(adProgressTable).where(
    and(eq(adProgressTable.postId, postId), eq(adProgressTable.userId, telegramUser.id))
  );
  if (isProgressUnlocked(progress, new Date())) {
    res.status(409).json({ error: "This content is already unlocked." });
    return;
  }

  const now = new Date();
  const session = await db.insert(adSessionsTable).values({
    ymid: randomUUID(),
    userId: telegramUser.id,
    postId,
    zoneId,
    expiresAt: new Date(now.getTime() + postbackSessionLifetimeMs),
  }).returning();
  const created = session[0];
  if (!created) { res.status(500).json({ error: "Could not start the ad session." }); return; }

  res.json(CreateAdSessionResponse.parse({
    ymid: created.ymid,
    zoneId: created.zoneId,
    expiresAt: created.expiresAt.toISOString(),
  }));
});

async function applyAdReward(session: typeof adSessionsTable.$inferSelect, now: Date) {
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(adSessionsTable)
      .where(eq(adSessionsTable.id, session.id))
      .for("update");
    if (!current || current.rewardedAt || current.expiresAt < now) return;

    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${session.userId}), ${session.postId})`);
    const [post] = await tx.select({ adsRequired: postsTable.adsRequired })
      .from(postsTable)
      .where(eq(postsTable.id, session.postId));
    if (!post) return;

    const [existing] = await tx.select().from(adProgressTable).where(
      and(eq(adProgressTable.postId, session.postId), eq(adProgressTable.userId, session.userId))
    );
    const countWindowActive = Boolean(
      existing?.lastAdWatchedAt &&
      now.getTime() - existing.lastAdWatchedAt.getTime() < unlockDurationMs
    );
    const watchedAds = countWindowActive ? (existing?.watchedAds ?? 0) + 1 : 1;

    if (existing) {
      await tx.update(adProgressTable).set({
        watchedAds,
        isUnlocked: watchedAds >= (post.adsRequired || 1),
        lastAdWatchedAt: now,
      }).where(eq(adProgressTable.id, existing.id));
    } else {
      await tx.insert(adProgressTable).values({
        userId: session.userId,
        postId: session.postId,
        watchedAds,
        isUnlocked: watchedAds >= (post.adsRequired || 1),
        lastAdWatchedAt: now,
      });
    }

    await tx.update(adSessionsTable).set({ rewardedAt: now }).where(eq(adSessionsTable.id, session.id));
  });
}

// Client claim fallback when Monetag SDK finishes viewing in Telegram Mini App
router.post("/ad-progress/claim", async (req, res): Promise<void> => {
  const telegramUser = verifyTelegramWebAppInitData(req.get("X-Telegram-Init-Data"));
  if (!telegramUser) {
    res.status(401).json({ error: "Open this Mini App from Telegram to claim ad reward." });
    return;
  }
  const { ymid, postId } = req.body || {};
  if (!ymid || !postId) {
    res.status(400).json({ error: "Missing ymid or postId" });
    return;
  }

  const now = new Date();
  const [session] = await db.select().from(adSessionsTable).where(
    and(
      eq(adSessionsTable.ymid, String(ymid)),
      eq(adSessionsTable.userId, telegramUser.id),
      eq(adSessionsTable.postId, Number(postId)),
    )
  );

  if (!session || session.expiresAt < now) {
    res.status(404).json({ error: "Invalid or expired session" });
    return;
  }

  await applyAdReward(session, now);

  const [progress] = await db.select().from(adProgressTable).where(
    and(eq(adProgressTable.postId, Number(postId)), eq(adProgressTable.userId, telegramUser.id))
  );

  res.json({
    success: true,
    isUnlocked: isProgressUnlocked(progress, new Date()),
    watchedAds: progress?.watchedAds ?? 1,
  });
});

router.get("/monetag/postback", async (req, res): Promise<void> => {
  const expectedSecret = process.env.MONETAG_POSTBACK_SECRET?.trim() || "monetag_secret_2026";

  const suppliedSecret = getQueryString(req.query.secret);
  if (!suppliedSecret || !secretMatches(suppliedSecret, expectedSecret)) {
    res.sendStatus(403);
    return;
  }

  const ymid = getQueryString(req.query.ymid);
  const eventType = getQueryString(req.query.event_type);
  const rewardEventType = getQueryString(req.query.reward_event_type);
  const zoneId = getQueryString(req.query.zone_id);
  if (!ymid || !eventType || !rewardEventType || !zoneId) { res.sendStatus(400); return; }
  if (eventType !== "impression" || rewardEventType !== "valued") { res.sendStatus(200); return; }

  const now = new Date();
  const [session] = await db.select().from(adSessionsTable)
    .where(eq(adSessionsTable.ymid, ymid));
  if (!session || session.zoneId !== zoneId || session.rewardedAt || session.expiresAt < now) {
    res.sendStatus(200);
    return;
  }

  await applyAdReward(session, now);
  res.sendStatus(200);
});

export default router;
