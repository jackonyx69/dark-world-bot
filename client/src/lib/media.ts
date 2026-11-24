export function mediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/uploads/")) return `/api${url}`;
  return url;
}

export function getProxiedMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) {
    return `/api/media-proxy?url=${encodeURIComponent(url)}`;
  }
  return mediaUrl(url);
}
