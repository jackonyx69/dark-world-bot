import { Router, type IRouter } from "express";
import { Readable } from "node:stream";

const router: IRouter = Router();

/**
 * Validates if a target URL is safe to proxy and prevents SSRF attacks.
 * Blocks private IP ranges, localhost, cloud metadata, and internal services.
 */
function isSafePublicUrl(targetUrl: URL): boolean {
  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return false;
  }

  const hostname = targetUrl.hostname.toLowerCase();

  // Block loopback and local hostnames
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("127.") ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return false;
  }

  // Block private and link-local IPv4 ranges
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [, aStr, bStr] = ipv4Match;
    const a = Number(aStr);
    const b = Number(bStr);

    if (a === 10) return false; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
    if (a === 192 && b === 168) return false; // 192.168.0.0/16
    if (a === 169 && b === 254) return false; // 169.254.0.0/16 Link-local / Cloud Metadata
    if (a === 0) return false;
  }

  // Block internal service ports (only allow standard web & media ports)
  if (targetUrl.port) {
    const port = Number(targetUrl.port);
    if (![80, 443, 8080, 8443].includes(port)) {
      return false;
    }
  }

  return true;
}

router.get("/media-proxy", async (req, res): Promise<void> => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl || typeof rawUrl !== "string") {
      res.status(400).send("Missing url parameter");
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      res.status(400).send("Invalid url parameter");
      return;
    }

    // SSRF validation
    if (!isSafePublicUrl(parsedUrl)) {
      res.status(403).send("Forbidden: Target host or address is not allowed");
      return;
    }

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Encoding": "identity",
    };

    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const upstreamResponse = await fetch(parsedUrl.toString(), {
      method: "GET",
      headers,
      redirect: "follow",
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      res.status(upstreamResponse.status).send(`Upstream error: ${upstreamResponse.statusText}`);
      return;
    }

    res.status(upstreamResponse.status);
    const contentType = upstreamResponse.headers.get("content-type") || "video/mp4";
    const contentLength = upstreamResponse.headers.get("content-length");
    const contentRange = upstreamResponse.headers.get("content-range");
    const acceptRanges = upstreamResponse.headers.get("accept-ranges") || "bytes";

    res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    res.setHeader("Accept-Ranges", acceptRanges);
    res.setHeader("Cache-Control", "public, max-age=3600");

    if (upstreamResponse.body) {
      const nodeStream = Readable.fromWeb(upstreamResponse.body as any);
      nodeStream.pipe(res);
      req.on("close", () => {
        nodeStream.destroy();
      });
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error("Media proxy error:", err);
    if (!res.headersSent) {
      res.status(502).send("Failed to proxy media stream");
    }
  }
});

export default router;
