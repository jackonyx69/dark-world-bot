import { Router, type IRouter } from "express";
import { db, usersTable, referralSettingsTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  RegisterUserBody,
  RegisterUserResponse,
  GetMeQueryParams,
  GetMeResponse,
  GetReferralStatsQueryParams,
  GetReferralStatsResponse,
} from "@workspace/api-zod";
import { getTelegramBotToken } from "../utils/telegram";

const router: IRouter = Router();

let cachedBotUsername: string | null = null;
let lastBotUsernameFetch = 0;

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function serializeUser(u: typeof usersTable.$inferSelect) {
  return {
    ...u,
    premiumExpiresAt: u.premiumExpiresAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt?.toISOString() ?? undefined,
  };
}

router.post("/users/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { telegramId, username, firstName, referralCode: usedCode } = parsed.data;

  let [existing] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  if (existing) {
    res.json(RegisterUserResponse.parse(serializeUser(existing)));
    return;
  }

  let referredBy: number | undefined;
  if (usedCode) {
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, usedCode));
    if (referrer) {
      referredBy = referrer.id;
      const newCount = referrer.referralCount + 1;
      const [reward] = await db.select()
        .from(referralSettingsTable)
        .where(eq(referralSettingsTable.friendsCount, newCount));

      if (reward && reward.freeDays > 0) {
        const bonusMs = reward.freeDays * 24 * 60 * 60 * 1000;
        const baseTime = referrer.premiumExpiresAt && referrer.premiumExpiresAt.getTime() > Date.now()
          ? referrer.premiumExpiresAt.getTime()
          : Date.now();
        await db.update(usersTable).set({
          referralCount: newCount,
          freeDaysEarned: referrer.freeDaysEarned + reward.freeDays,
          isPremium: true,
          premiumExpiresAt: new Date(baseTime + bonusMs),
        }).where(eq(usersTable.id, referrer.id));
      } else {
        await db.update(usersTable).set({ referralCount: newCount }).where(eq(usersTable.id, referrer.id));
      }
    }
  }

  let code: string;
  do {
    code = generateReferralCode();
    const [c] = await db.select().from(usersTable).where(eq(usersTable.referralCode, code));
    if (!c) break;
  } while (true);

  const [user] = await db.insert(usersTable).values({
    telegramId, username, firstName,
    referralCode: code,
    referredBy,
  }).returning();

  res.status(201).json(RegisterUserResponse.parse(serializeUser(user)));
});

router.get("/users/me", async (req, res): Promise<void> => {
  const parsed = GetMeQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, parsed.data.telegramId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(GetMeResponse.parse(serializeUser(user)));
});

router.get("/users/referral-stats", async (req, res): Promise<void> => {
  const parsed = GetReferralStatsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, parsed.data.telegramId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [settings] = await db.select({ telegramUsername: settingsTable.telegramUsername }).from(settingsTable).limit(1);
  const botToken = getTelegramBotToken();
  let botUsername = cachedBotUsername || settings?.telegramUsername?.replace(/^@/, "") || "darkwould_bot";
  if (botToken && (!cachedBotUsername || Date.now() - lastBotUsernameFetch > 10 * 60 * 1000)) {
    try {
      lastBotUsernameFetch = Date.now();
      const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const telegramData = await telegramResponse.json() as {
        ok?: boolean;
        result?: { username?: string };
      };
      if (telegramData.ok && telegramData.result?.username) {
        botUsername = telegramData.result.username;
        cachedBotUsername = telegramData.result.username;
      }
    } catch {
      // Keep the configured fallback when Telegram cannot be reached.
    }
  }
  const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;

  res.json(GetReferralStatsResponse.parse({
    referralCode: user.referralCode,
    referralCount: user.referralCount,
    freeDaysEarned: user.freeDaysEarned,
    referralLink,
  }));
});

export default router;
