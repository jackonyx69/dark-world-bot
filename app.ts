import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.ts";
import { logger } from "./utils/logger";
import path from "node:path";
import fs from "node:fs";
import { db, settingsTable, postsTable } from "@workspace/db";
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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/uploads", express.static(uploadRoot));
app.use("/api/uploads", express.static(uploadRoot));

app.use("/api", async (req, res, next) => {
  if (req.path.startsWith("/admin") || req.path === "/settings" || req.path === "/healthz" || req.path === "/health") {
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
  app.use(async (req, res, next) => {
    if (
      req.method === "GET" &&
      !req.path.startsWith("/api") &&
      !req.path.startsWith("/uploads") &&
      req.accepts("html")
    ) {
      const indexPath = path.join(webRoot, "index.html");
      if (req.path.startsWith("/post/")) {
        const slug = req.path.slice("/post/".length).split("/")[0]?.trim();
        if (slug) {
          try {
            const [post] = await db
              .select({
                title: postsTable.title,
                description: postsTable.description,
                thumbnailUrl: postsTable.thumbnailUrl,
              })
              .from(postsTable)
              .where(eq(postsTable.slug, slug))
              .limit(1);

            if (post) {
              let html = fs.readFileSync(indexPath, "utf8");
              const postTitle = post.title.replace(/"/g, "&quot;");
              const postDesc = (post.description || `${post.title} — Dark Would Expose`).replace(/"/g, "&quot;");
              const postImage = post.thumbnailUrl ? post.thumbnailUrl.replace(/"/g, "&quot;") : "";

              html = html.replace(/<title>.*?<\/title>/i, `<title>${postTitle} — Dark Would Expose</title>`);
              html = html.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${postTitle}" />`);
              html = html.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${postTitle}" />`);
              html = html.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${postDesc}" />`);
              html = html.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${postDesc}" />`);

              if (postImage) {
                const ogImageTag = `<meta property="og:image" content="${postImage}" />\n    <meta name="twitter:image" content="${postImage}" />`;
                html = html.replace(/<\/head>/i, `    ${ogImageTag}\n  </head>`);
              }

              res.setHeader("Content-Type", "text/html; charset=utf-8");
              res.send(html);
              return;
            }
          } catch {
            // fallback to default index.html
          }
        }
      }

      res.sendFile(indexPath);
      return;
    }
    next();
  });
}

export default app;
