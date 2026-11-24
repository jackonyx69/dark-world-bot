import zlib from "node:zlib";
import { type Request, type Response, type NextFunction } from "express";

/**
 * Lightweight zero-dependency HTTP response compression using native node:zlib
 */
export function compressionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const acceptEncoding = (req.headers["accept-encoding"] as string) || "";
  if (!acceptEncoding.includes("gzip")) {
    next();
    return;
  }

  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);

  (res as any).json = function (body: any) {
    try {
      const jsonString = JSON.stringify(body);
      // Only compress payloads >= 1KB for optimal CPU efficiency
      if (jsonString.length < 1024) {
        return originalJson(body);
      }

      zlib.gzip(Buffer.from(jsonString, "utf8"), (err, compressed) => {
        if (err || !compressed) {
          return originalJson(body);
        }
        res.setHeader("Content-Encoding", "gzip");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.removeHeader("Content-Length");
        originalSend(compressed);
      });
    } catch {
      return originalJson(body);
    }
  };

  next();
}
