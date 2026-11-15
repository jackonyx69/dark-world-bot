import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "../../../models";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL || "pglite://local";

let dbInstance: any;
let poolInstance: any;

const isExternalPostgres =
  (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")) &&
  !databaseUrl.includes("localhost:5432") &&
  !databaseUrl.includes("127.0.0.1:5432");

if (isExternalPostgres) {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { default: pg } = await import("pg");
  poolInstance = new pg.Pool({
    connectionString: databaseUrl,
    ssl:
      databaseUrl.includes("sslmode=require") ||
      databaseUrl.includes("neon.tech") ||
      databaseUrl.includes("supabase.co")
        ? { rejectUnauthorized: false }
        : undefined,
  });
  dbInstance = drizzle(poolInstance, { schema });
  try {
    await poolInstance.query(`
      CREATE TABLE IF NOT EXISTS "ad_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "enabled" boolean DEFAULT true NOT NULL,
        "hide_for_premium" boolean DEFAULT true NOT NULL,
        "header_script" text,
        "popunder_script" text,
        "top_banner" text,
        "top_banner_enabled" boolean DEFAULT true NOT NULL,
        "bottom_banner" text,
        "bottom_banner_enabled" boolean DEFAULT true NOT NULL,
        "feed_banner" text,
        "feed_banner_enabled" boolean DEFAULT true NOT NULL,
        "monetag_zone_id" text,
        "direct_link_url" text,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
      INSERT INTO "ad_settings" ("id", "enabled", "hide_for_premium", "top_banner_enabled", "bottom_banner_enabled", "feed_banner_enabled", "monetag_zone_id")
      SELECT 1, true, true, true, true, true, '8912345'
      WHERE NOT EXISTS (SELECT 1 FROM "ad_settings");
    `);
  } catch (err) {
    console.warn("External database ad_settings check warning:", err);
  }
} else {
  // Local embedded fallback (runs instantly on localhost without any external database)
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");

  const dataDir = path.resolve(__dirname, "../../../.data/pgdata");
  fs.mkdirSync(dataDir, { recursive: true });
  const pidFile = path.join(dataDir, "postmaster.pid");
  if (fs.existsSync(pidFile)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {}
  }

  let pglite: any;
  try {
    pglite = new PGlite(dataDir);
    await pglite.waitReady;
  } catch {
    pglite = new PGlite();
    await pglite.waitReady;
  }

  try {
    const check: any = await pglite.query(
      "SELECT count(*) as count FROM information_schema.tables WHERE table_schema='public'"
    );
    if (parseInt(check.rows[0]?.count || "0", 10) === 0) {
      const migrationFile = path.resolve(__dirname, "../../../drizzle/0000_lonely_siren.sql");
      if (fs.existsSync(migrationFile)) {
        const rawSql = fs.readFileSync(migrationFile, "utf8");
        for (const statement of rawSql
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter(Boolean)) {
          await pglite.exec(statement);
        }
      }
    }
    await pglite.exec(`
      CREATE TABLE IF NOT EXISTS "ad_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "enabled" boolean DEFAULT true NOT NULL,
        "hide_for_premium" boolean DEFAULT true NOT NULL,
        "header_script" text,
        "popunder_script" text,
        "top_banner" text,
        "top_banner_enabled" boolean DEFAULT true NOT NULL,
        "bottom_banner" text,
        "bottom_banner_enabled" boolean DEFAULT true NOT NULL,
        "feed_banner" text,
        "feed_banner_enabled" boolean DEFAULT true NOT NULL,
        "monetag_zone_id" text,
        "direct_link_url" text,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
      INSERT INTO "ad_settings" ("id", "enabled", "hide_for_premium", "top_banner_enabled", "bottom_banner_enabled", "feed_banner_enabled", "monetag_zone_id")
      SELECT 1, true, true, true, true, true, '8912345'
      WHERE NOT EXISTS (SELECT 1 FROM "ad_settings");
    `);
  } catch (err) {
    console.error("Local database init error:", err);
  }

  dbInstance = drizzle(pglite, { schema });
  poolInstance = {
    query: (text: string, params?: any[]) => pglite.query(text, params),
    connect: async () => ({
      query: (text: string, params?: any[]) => pglite.query(text, params),
      release: () => {},
    }),
  };
}

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type pg from "pg";

export const pool: pg.Pool = poolInstance;
export const db: NodePgDatabase<typeof schema> = dbInstance;
export * from "../../../models";
