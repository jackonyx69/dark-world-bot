import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

export interface AdSettingsData {
  enabled: boolean;
  hideForPremium: boolean;
  headerScript?: string | null;
  popunderScript?: string | null;
  topBanner?: string | null;
  topBannerEnabled: boolean;
  bottomBanner?: string | null;
  bottomBannerEnabled: boolean;
  feedBanner?: string | null;
  feedBannerEnabled: boolean;
  monetagZoneId?: string | null;
  directLinkUrl?: string | null;
}

export function useAdSettings() {
  return useQuery<AdSettingsData>({
    queryKey: ["public-ad-settings"],
    queryFn: async () => {
      const res = await fetch("/api/ads");
      if (!res.ok) throw new Error("Failed to load ad settings");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Executes embedded script tags in raw HTML content safely without duplicate runs
 */
function renderHtmlWithScripts(container: HTMLElement, rawHtml: string) {
  container.innerHTML = "";
  if (!rawHtml.trim()) return;

  const temp = document.createElement("div");
  temp.innerHTML = rawHtml;

  // Extract all script elements so they don't execute multiple times
  const scripts = Array.from(temp.querySelectorAll("script"));
  const replacements: Array<{ placeholder: Comment; script: HTMLScriptElement }> = [];

  scripts.forEach((oldScript) => {
    const newScript = document.createElement("script");
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.textContent = oldScript.textContent;
    const placeholder = document.createComment("ad-script");
    oldScript.parentNode?.replaceChild(placeholder, oldScript);
    replacements.push({ placeholder, script: newScript });
  });

  // Append remaining DOM (images, iframes, wrappers)
  while (temp.firstChild) {
    container.appendChild(temp.firstChild);
  }

  // Replace placeholders with executable scripts
  replacements.forEach(({ placeholder, script }) => {
    placeholder.parentNode?.replaceChild(script, placeholder);
  });
}

/**
 * Site-wide global scripts (Monetag In-Page Push, Popunder, MultiTag, etc.)
 */
export function AdGlobalScripts() {
  const { data: ads } = useAdSettings();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!ads || !ads.enabled) return;

    // Check if user is premium
    const isPremium = localStorage.getItem("dwe_user_is_premium") === "true";
    if (isPremium && ads.hideForPremium) return;

    // Inject header / popunder scripts
    const scriptContent = [ads.headerScript, ads.popunderScript].filter(Boolean).join("\n");
    if (!scriptContent.trim()) return;

    const container = document.createElement("div");
    container.id = "dwe-global-ad-scripts";
    container.style.display = "none";
    document.body.appendChild(container);
    renderHtmlWithScripts(container, scriptContent);

    return () => {
      const el = document.getElementById("dwe-global-ad-scripts");
      if (el) el.remove();
    };
  }, [ads]);

  return null;
}

/**
 * Slot-specific Ad Banner component (top, bottom, feed)
 */
export function AdBanner({
  slot,
  className = "",
}: {
  slot: "top" | "bottom" | "feed";
  className?: string;
}) {
  const { data: ads, isLoading } = useAdSettings();
  const bannerRef = useRef<HTMLDivElement>(null);

  const isPremium = typeof window !== "undefined" && localStorage.getItem("dwe_user_is_premium") === "true";

  useEffect(() => {
    if (isLoading || !ads || !ads.enabled || !bannerRef.current) return;
    if (isPremium && ads.hideForPremium) return;

    let html = "";
    let isEnabled = false;

    if (slot === "top") {
      html = ads.topBanner || "";
      isEnabled = ads.topBannerEnabled;
    } else if (slot === "bottom") {
      html = ads.bottomBanner || "";
      isEnabled = ads.bottomBannerEnabled;
    } else if (slot === "feed") {
      html = ads.feedBanner || "";
      isEnabled = ads.feedBannerEnabled;
    }

    if (isEnabled && html) {
      renderHtmlWithScripts(bannerRef.current, html);
    } else {
      bannerRef.current.innerHTML = "";
    }
  }, [ads, isLoading, slot, isPremium]);

  if (isLoading || !ads || !ads.enabled) return null;
  if (isPremium && ads.hideForPremium) return null;

  const isSlotEnabled =
    (slot === "top" && ads.topBannerEnabled && Boolean(ads.topBanner)) ||
    (slot === "bottom" && ads.bottomBannerEnabled && Boolean(ads.bottomBanner)) ||
    (slot === "feed" && ads.feedBannerEnabled && Boolean(ads.feedBanner));

  if (!isSlotEnabled) return null;

  return (
    <div className={`w-full flex flex-col items-center justify-center my-3 overflow-hidden ${className}`}>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1 font-semibold">
        ADVERTISEMENT / বিজ্ঞাপন
      </div>
      <div
        ref={bannerRef}
        className="w-full flex items-center justify-center min-h-[50px] max-w-full rounded-xl overflow-hidden bg-card/40 border border-white/5 p-1"
      />
    </div>
  );
}
