import { createHmac, timingSafeEqual } from "node:crypto";

export type VerifiedTelegramWebAppUser = {
  id: string;
  username?: string;
  firstName?: string;
};

export function getTelegramBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token || null;
}

export function verifyTelegramWebAppInitData(initData: string | undefined): VerifiedTelegramWebAppUser | null {
  if (!initData || initData.length > 8192) return null;

  const params = new URLSearchParams(initData);
  const userValue = params.get("user");
  if (!userValue) return null;

  const token = getTelegramBotToken();
  if (!token) {
    // Development or TELEGRAM_BOT_TOKEN not yet configured: safely extract user without cryptographic check
    try {
      const user = JSON.parse(userValue) as Record<string, unknown>;
      const id = typeof user.id === "number" && Number.isSafeInteger(user.id)
        ? String(user.id)
        : typeof user.id === "string" && /^\d{1,16}$/.test(user.id)
          ? user.id
          : null;
      if (!id || !/^\d{1,16}$/.test(id)) return null;

      return {
        id,
        username: typeof user.username === "string" ? user.username : undefined,
        firstName: typeof user.first_name === "string" ? user.first_name : undefined,
      };
    } catch {
      return null;
    }
  }

  const entries = [...params.entries()];
  if (params.getAll("hash").length !== 1) return null;
  if (new Set(entries.map(([key]) => key)).size !== entries.length) return null;

  const suppliedHash = params.get("hash") || "";
  if (!/^[a-f0-9]{64}$/i.test(suppliedHash)) return null;

  const authDate = Number(params.get("auth_date"));
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(authDate) || authDate > now + 300 || now - authDate > 86400) return null;

  const dataCheckString = entries
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest();
  const candidateHash = Buffer.from(suppliedHash, "hex");
  if (candidateHash.length !== expectedHash.length || !timingSafeEqual(candidateHash, expectedHash)) return null;

  try {
    const user = JSON.parse(userValue) as Record<string, unknown>;
    const id = typeof user.id === "number" && Number.isSafeInteger(user.id)
      ? String(user.id)
      : typeof user.id === "string" && /^\d{1,16}$/.test(user.id)
        ? user.id
        : null;
    if (!id || !/^\d{1,16}$/.test(id)) return null;

    return {
      id,
      username: typeof user.username === "string" ? user.username : undefined,
      firstName: typeof user.first_name === "string" ? user.first_name : undefined,
    };
  } catch {
    return null;
  }
}

export function getTelegramWebhookSecret(): string | null {
  const token = getTelegramBotToken();
  if (!token) return null;
  return createHmac("sha256", token).update("dark-would-expose:telegram-webhook:v1").digest("hex");
}

export function isValidTelegramWebhookSecret(candidate: string | undefined): boolean {
  const expected = getTelegramWebhookSecret();
  if (!expected || !candidate) return false;
  const candidateBytes = Buffer.from(candidate, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

export function extractTelegramChannelId(channelLinkOrId: string | null | undefined): string | null {
  if (!channelLinkOrId) return null;
  const trimmed = channelLinkOrId.trim();
  if (!trimmed) return null;

  // Numeric chat ID (e.g. -1001234567890 or 123456789)
  if (/^-?\d+$/.test(trimmed)) {
    return trimmed;
  }

  // Username starting with @ (e.g. @darkwouldchannel)
  if (/^@[A-Za-z0-9_]{4,}$/.test(trimmed)) {
    return trimmed;
  }

  // URL format (e.g. https://t.me/channel_name or t.me/channel_name)
  const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?t\.me\/([A-Za-z0-9_]{4,})\/?$/i);
  if (urlMatch && urlMatch[1]) {
    return `@${urlMatch[1]}`;
  }

  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export function escapeTelegramHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type TelegramChannelPostParams = {
  channelIdOrLink: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  slug: string;
  botUsername?: string;
};

export async function sendTelegramChannelPost(params: {
  channelIdOrLink: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  slug: string;
  botUsername?: string;
}): Promise<{ success: boolean; error?: string }> {
  const botToken = getTelegramBotToken();
  if (!botToken) {
    return { success: false, error: "Telegram bot token is not configured" };
  }

  const chatId = extractTelegramChannelId(params.channelIdOrLink);
  if (!chatId) {
    return { success: false, error: "Invalid Telegram channel identifier" };
  }

  const botUsername = (params.botUsername || "Dark_Would_Expose_bot").replace(/^@/, "");
  const miniAppWatchUrl = `https://t.me/${botUsername}/app?startapp=post_${params.slug}`;

  const cleanTitle = escapeTelegramHtml(params.title);
  const cleanDesc = params.description ? escapeTelegramHtml(params.description) : "";
  const caption =
    `🎬 <b>${cleanTitle}</b>\n\n` +
    (cleanDesc ? `📝 <i>${cleanDesc}</i>\n\n` : "") +
    `🔥 <i>নতুন ভিডিও রিলিজ হয়েছে! এখনই দেখতে নিচের বাটনে ক্লিক করুন 👇</i>`;

  const inlineKeyboard = [
    [
      {
        text: "🎬 Watch Now",
        url: miniAppWatchUrl,
      },
    ],
  ];

  const payloadReplyMarkup = {
    inline_keyboard: inlineKeyboard,
  };

  // If thumbnailUrl is available and starts with http(s), try sendPhoto
  const isRemotePhoto = typeof params.thumbnailUrl === "string" && /^https?:\/\//i.test(params.thumbnailUrl);
  if (isRemotePhoto) {
    try {
      const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: params.thumbnailUrl,
          caption,
          parse_mode: "HTML",
          reply_markup: payloadReplyMarkup,
        }),
      });

      const photoData = await photoRes.json() as { ok: boolean; description?: string };
      if (photoData.ok) {
        return { success: true };
      }
      console.warn("Telegram sendPhoto failed, falling back to sendMessage:", photoData.description);
    } catch (err) {
      console.warn("Telegram sendPhoto network error, falling back to sendMessage:", err);
    }
  }

  // Fallback to text sendMessage
  try {
    const textRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: caption,
        parse_mode: "HTML",
        reply_markup: payloadReplyMarkup,
      }),
    });

    const textData = await textRes.json() as { ok: boolean; description?: string };
    if (textData.ok) {
      return { success: true };
    }
    return { success: false, error: textData.description || "Failed to send message to Telegram channel" };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reach Telegram Bot API" };
  }
}

export async function sendTelegramMessage(
  chatId: string | null | undefined,
  text: string,
): Promise<boolean> {
  const botToken = getTelegramBotToken();
  if (!botToken || !chatId || !text.trim()) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    return response.ok;
  } catch {
    return false;
  }
}