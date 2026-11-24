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
      databaseUrl.includes("supabase.co") ||
      databaseUrl.includes("render.com") ||
      databaseUrl.includes("dpg-")
        ? { rejectUnauthorized: false }
        : undefined,
  });
  dbInstance = drizzle(poolInstance, { schema });
  try {
    const migrationCandidates = [
      path.resolve(__dirname, "../../../drizzle/0000_lonely_siren.sql"),
      path.resolve(process.cwd(), "drizzle/0000_lonely_siren.sql"),
      path.resolve("/opt/render/project/src/drizzle/0000_lonely_siren.sql"),
    ];
    const migrationFile = migrationCandidates.find((f) => fs.existsSync(f));
    if (migrationFile) {
      const rawSql = fs.readFileSync(migrationFile, "utf8");
      for (const statement of rawSql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean)) {
        try {
          const safeStatement = statement.replace(/^CREATE TABLE "/i, 'CREATE TABLE IF NOT EXISTS "');
          await poolInstance.query(safeStatement);
        } catch (stErr: any) {
          if (stErr.code !== "42P07" && stErr.code !== "42710") {
            console.warn("External migration notice:", stErr.message);
          }
        }
      }
    }
    await poolInstance.query(`
      CREATE TABLE IF NOT EXISTS "admin_credentials" (
        "id" serial PRIMARY KEY NOT NULL,
        "password_hash" text NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
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
      INSERT INTO "settings" ("id", "site_name", "enable_notice", "enable_referral", "postgres_enabled", "maintenance_mode")
      SELECT 1, 'Dark Would Expose', false, true, true, false
      WHERE NOT EXISTS (SELECT 1 FROM "settings");
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "watermark_text" text DEFAULT '@Dark_Would_Expose_bot';
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "enable_watermark" boolean DEFAULT true;
    `);
  } catch (err) {
    console.warn("External database setup warning:", err);
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
    const migrationFile = path.resolve(__dirname, "../../../drizzle/0000_lonely_siren.sql");
    if (fs.existsSync(migrationFile)) {
      const rawSql = fs.readFileSync(migrationFile, "utf8");
      for (const statement of rawSql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean)) {
        try {
          const safeStatement = statement.replace(/^CREATE TABLE "/i, 'CREATE TABLE IF NOT EXISTS "');
          await pglite.exec(safeStatement);
        } catch (stErr: any) {
          // ignore duplicate tables
        }
      }
    }
    await pglite.exec(`
      CREATE TABLE IF NOT EXISTS "admin_credentials" (
        "id" serial PRIMARY KEY NOT NULL,
        "password_hash" text NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
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
      INSERT INTO "settings" ("id", "site_name", "enable_notice", "enable_referral", "postgres_enabled", "maintenance_mode")
      SELECT 1, 'Dark Would Expose', false, true, true, false
      WHERE NOT EXISTS (SELECT 1 FROM "settings");
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "watermark_text" text DEFAULT '@Dark_Would_Expose_bot';
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "enable_watermark" boolean DEFAULT true;
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
