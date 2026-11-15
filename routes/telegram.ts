import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
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
    .select({ webhookUrl: settingsTable.webhookUrl })
    .from(settingsTable)
    .limit(1);
  const webhookUrl = settings?.webhookUrl || process.env.TELEGRAM_WEBHOOK_URL;
  const miniAppUrl = getMiniAppUrl(webhookUrl);
  if (!miniAppUrl) {
    res.sendStatus(503);
    return;
  }

  const firstName = typeof message.from?.first_name === "string" && message.from.first_name.trim()
    ? escapeHtml(message.from.first_name.trim())
    : "বন্ধু";
  const welcomeMessage =
    `👋 হ্যালো ${firstName} !\n\n` +
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
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: welcomeMessage,
        reply_markup: {
          inline_keyboard: [[{
            text: "Open Dark Would",
            web_app: { url: miniAppUrl },
          }]],
        },
      }),
    });
    res.sendStatus(response.ok ? 200 : 502);
  } catch {
    res.sendStatus(502);
  }
});

export default router;
