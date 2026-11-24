import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getStoredValue, getBrowserUserId, setStoredValue } from "@/lib/storage";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: { id?: number; username?: string; first_name?: string };
          start_param?: string;
        };
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

function bootstrapTelegramUser() {
  try {
    const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const queryReferral = new URLSearchParams(window.location.search).get("ref");
    if (queryReferral) setStoredValue("dwe_referral_code", queryReferral);

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready?.();
      window.Telegram.WebApp.expand?.();
    }

    if (telegramUser?.id) {
      setStoredValue("dwe_user_tg_id", String(telegramUser.id));
      setStoredValue("dwe_user_username", telegramUser.username || "");
      setStoredValue("dwe_user_first_name", telegramUser.first_name || "");
      return;
    }

    if (!getStoredValue("dwe_user_tg_id")) {
      setStoredValue("dwe_user_tg_id", getBrowserUserId());
    }
  } catch (error) {
    console.warn("Telegram bootstrap could not read the user context; continuing without it.", error);
  }
}

bootstrapTelegramUser();
setAuthTokenGetter(() => getStoredValue("dwe_admin_token"));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
