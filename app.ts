import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.ts";
import { logger } from "./utils/logger";
import path from "node:path";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const app: Express = express();
const webRoot = process.env.WEB_DIST_DIR
  ? path.resolve(process.env.WEB_DIST_DIR)
  : path.resolve(process.cwd(), "dist", "public");
const uploadRoot = path.resolve(
  process.env.UPLOADS_DIR || path.resolve(process.cwd(), "public", "uploads"),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "35mb" }));
app.use(express.urlencoded({ extended: true, limit: "35mb" }));
app.use("/uploads", express.static(uploadRoot));
app.use("/api/uploads", express.static(uploadRoot));

app.use("/api", async (req, res, next) => {
  if (req.path.startsWith("/admin") || req.path === "/settings" || req.path === "/healthz") {
    next();
    return;
  }
  try {
    const [settings] = await db.select({
      maintenanceMode: settingsTable.maintenanceMode,
      maintenanceMessage: settingsTable.maintenanceMessage,
    }).from(settingsTable).limit(1);
    if (settings?.maintenanceMode) {
      res.status(503).json({
        error: "maintenance",
        message: settings.maintenanceMessage || "The app is temporarily unavailable for maintenance.",
      });
      return;
    }
  } catch {
    // Keep the existing API behavior if the optional maintenance check cannot run.
  }
  next();
});

app.use("/api", router);

app.use("/api", (err: any, req: any, res: any, next: any) => {
  console.error("API Error at", req.method, req.path, ":", err);
  res.status(500).json({ error: err?.message || "Internal Server Error" });
});

if (webRoot) {
  app.use(express.static(webRoot));
  app.use((req, res, next) => {
    if (
      req.method === "GET" &&
      !req.path.startsWith("/api") &&
      !req.path.startsWith("/uploads") &&
      req.accepts("html")
    ) {
      res.sendFile(path.join(webRoot, "index.html"));
      return;
    }
    next();
  });
}

export default app;
