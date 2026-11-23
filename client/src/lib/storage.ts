let fallbackBrowserId: string | undefined;

export function getStoredValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStoredValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // App routes still render when storage is unavailable.
  }
}

export function getBrowserUserId(): string {
  const stored = getStoredValue("dwe_user_tg_id");
  if (stored) return stored;
  if (!fallbackBrowserId) {
    const randomId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    fallbackBrowserId = `web_${randomId}`;
  }
  return fallbackBrowserId;
}
