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