import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

try {
  process.loadEnvFile?.();
} catch {
  // .env is optional if environment variables are provided by the hosting environment
}

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.join(projectRoot, "public", "uploads");

process.env.NODE_ENV ||= "production";
process.env.UPLOADS_DIR ||= uploadRoot;
process.env.PORT ||= "5000";
process.env.DATABASE_URL ||= "pglite://local";
process.env.SESSION_SECRET ||= "dark-would-expose-session-secret-key-2026";
process.env.ADMIN_PASSWORD ||= "jack123";
process.env.WEB_DIST_DIR ||= path.join(projectRoot, "dist", "public");

await mkdir(uploadRoot, { recursive: true });
const { default: app } = await import("./app.ts");

if (process.env.NODE_ENV === "development") {
  const vite = await createViteServer({
    root: projectRoot,
    appType: "spa",
    resolve: {
      alias: {
        "@": path.join(projectRoot, "client", "src"),
      },
      dedupe: ["react", "react-dom", "@tanstack/react-query"],
    },
    server: {
      middlewareMode: true,
      allowedHosts: true,
    },
  });
  app.use(vite.middlewares);
} else {
  process.env.WEB_DIST_DIR ||= path.join(projectRoot, "dist", "public");
}

app.listen(Number(process.env.PORT), "0.0.0.0", () => {
  console.info(`Dark Would Expose source server listening on port ${process.env.PORT}`);
});
