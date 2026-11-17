import { Router, type IRouter } from "express";
import { db, settingsTable, postsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getTelegramBotToken, isValidTelegramWebhookSecret } from "../utils/telegram";

const router: IRouter = Router();
const webhookPathSuffix = "/api/telegram/webhook";

type TelegramMessage = {
  text?: unknown;
  chat?: { id?: unknown; type?: unknown };
  from?: { first_name?: unknown };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMiniAppUrl(webhookUrl: string | null | undefined): string | null {
  if (!webhookUrl) return null;

  try {
    const url = new URL(webhookUrl);
    const pathname = url.pathname.replace(/\/+$/, "");
    if (url.protocol !== "https:" || !pathname.endsWith(webhookPathSuffix)) return null;

    const basePath = pathname.slice(0, -webhookPathSuffix.length) || "/";
    url.pathname = basePath.endsWith("/") ? basePath : `${basePath}/`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isStartCommand(text: string): boolean {
  return /^\/start(?:@[A-Za-z0-9_]+)?(?:\s|$)/i.test(text.trim());
}

router.post("/telegram/webhook", async (req, res): Promise<void> => {
  if (!getTelegramBotToken()) {
    res.sendStatus(503);
    return;
  }
  if (!isValidTelegramWebhookSecret(req.get("X-Telegram-Bot-Api-Secret-Token"))) {
    res.sendStatus(401);
    return;
  }

  const body = isRecord(req.body) ? req.body : {};
  const message = isRecord(body.message) ? body.message as TelegramMessage : null;
  const text = typeof message?.text === "string" ? message.text : "";
  const chat = isRecord(message?.chat) ? message.chat : null;
  if (!message || !isStartCommand(text) || chat?.type !== "private") {
    res.sendStatus(200);
    return;
  }

  const chatId = typeof chat.id === "number" || typeof chat.id === "string" ? chat.id : null;
  if (chatId === null) {
    res.sendStatus(200);
    return;
  }

  const [settings] = await db
    .select({
      webhookUrl: settingsTable.webhookUrl,
      channelLink: settingsTable.channelLink,
      groupLink: settingsTable.groupLink,
      telegramUsername: settingsTable.telegramUsername,
    })
    .from(settingsTable)
    .limit(1);
  const webhookUrl = settings?.webhookUrl || process.env.TELEGRAM_WEBHOOK_URL;
  let miniAppUrl = getMiniAppUrl(webhookUrl);
  if (!miniAppUrl) {
    const host = req.get("host");
    miniAppUrl = host ? `https://${host}/` : "https://dark-world-bot.onrender.com/";
  }

  const firstName = typeof message.from?.first_name === "string" && message.from.first_name.trim()
    ? escapeHtml(message.from.first_name.trim())
    : "বন্ধু";

  const startArgMatch = text.trim().match(/^\/start(?:@[A-Za-z0-9_]+)?\s+(.+)$/i);
  const startArg = startArgMatch ? startArgMatch[1].trim() : "";
  const postSlug = startArg ? startArg.replace(/^post_/, "").trim() : "";
  const targetMiniAppUrl = postSlug ? `${miniAppUrl.replace(/\/+$/, "")}/post/${postSlug}` : miniAppUrl;

  let postTitle = "";
  let postThumbnail: string | null = null;
  if (postSlug) {
    try {
      const [found] = await db
        .select({ title: postsTable.title, thumbnailUrl: postsTable.thumbnailUrl })
        .from(postsTable)
        .where(eq(postsTable.slug, postSlug))
        .limit(1);
      if (found) {
        postTitle = found.title;
        postThumbnail = found.thumbnailUrl;
      }
    } catch {
      // ignore db error
    }
  }

  const welcomeMessage = postSlug
    ? `👋 হ্যালো ${firstName}!\n\n` +
      `🎬 <b>${escapeHtml(postTitle || postSlug)}</b>\n\n` +
      `ভিডিওটি দেখতে নিচের বাটনে ক্লিক করুন 🔽`
    : `👋 হ্যালো ${firstName} !\n\n` +
      "🌑 Dark Would Expose-এ তোমাকে স্বাগতম।\n" +
      "নতুন, পুরাতন, বাংলাদেশের সবধরনের ভাইরাল ভিডিও একসাথে পেয়ে যাবেন এখানে।\n\n" +
      "কী? বিশ্বাস হচ্ছে না?\n" +
      "তাহলে ঘুরে আসুন আমাদের Dark Would-এ।\n\n" +
      "🚀 ক্লিক করুন Open Dark Would-এ 🔽";

  try {
    const token = getTelegramBotToken();
    if (!token) {
      res.sendStatus(503);
      return;
    }

    const buttonTitle = postTitle ? `🎬 Play "${postTitle}"` : (postSlug ? "🎬 Watch Video Now" : "🚀 Open Dark Would");
    const inlineKeyboard: Array<Array<{ text: string; url?: string; web_app?: { url: string } }>> = [
      [{
        text: buttonTitle,
        web_app: { url: targetMiniAppUrl },
      }],
    ];

    const communityButtons: Array<{ text: string; url: string }> = [];
    if (settings?.channelLink) {
      communityButtons.push({ text: "📢 Join Channel", url: settings.channelLink });
    }
    if (settings?.groupLink) {
      communityButtons.push({ text: "💬 Join Group", url: settings.groupLink });
    }
    if (communityButtons.length > 0) {
      inlineKeyboard.push(communityButtons);
    }

    if (settings?.telegramUsername) {
      inlineKeyboard.push([{
        text: "👤 Contact Admin",
        url: `https://t.me/${settings.telegramUsername.replace(/^@/, "")}`,
      }]);
    }

    if (postThumbnail && postThumbnail.startsWith("http")) {
      try {
        const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            photo: postThumbnail,
            caption: welcomeMessage,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: inlineKeyboard,
            },
          }),
        });
        if (photoRes.ok) {
          res.sendStatus(200);
          return;
        }
      } catch {
        // fallback to sendMessage
      }
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: welcomeMessage,
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      }),
    });
    res.sendStatus(response.ok ? 200 : 502);
  } catch {
    res.sendStatus(502);
  }
});

export default router;
