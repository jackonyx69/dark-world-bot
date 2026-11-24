import jwt from "jsonwebtoken";
import { type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import { db, adminCredentialsTable } from "@workspace/db";
import { logActivity } from "../utils/activity";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.SESSION_SECRET;
function requireSecret(name: string, fallback: string): string {
  const value = process.env[name] || fallback;
  return value;
}
const adminPassword = requireSecret("ADMIN_PASSWORD", "jack123");
const jwtSecret = requireSecret("SESSION_SECRET", "dark-would-expose-session-secret-key-2026");

export function hashAdminPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function matchesHash(password: string, encoded: string): boolean {
  const [salt, stored] = encoded.split(":");
  if (!salt || !stored) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return stored.length === derived.length && crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(derived));
}

export function signAdminToken(): string {
  return jwt.sign({ role: "admin" }, jwtSecret, { expiresIn: "7d" });
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const cleanPass = (password || "").trim();
  if (!cleanPass) return false;

  const [credential] = await db.select().from(adminCredentialsTable).limit(1);

  // If password hash already exists in database, strictly verify against that hash
  if (credential && credential.passwordHash) {
    return matchesHash(cleanPass, credential.passwordHash);
  }

  // Initial bootstrap: only if no credential exists in database yet
  const envPass = (process.env.ADMIN_PASSWORD || adminPassword || "jack123").trim();
  if (cleanPass === envPass) {
    await db.insert(adminCredentialsTable).values({ passwordHash: hashAdminPassword(cleanPass) });
    return true;
  }
  return false;
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<boolean> {
  if (!(await verifyAdminPassword(currentPassword))) return false;
  const [credential] = await db.select().from(adminCredentialsTable).limit(1);
  if (credential) {
    await db.update(adminCredentialsTable).set({ passwordHash: hashAdminPassword(newPassword) });
  } else {
    await db.insert(adminCredentialsTable).values({ passwordHash: hashAdminPassword(newPassword) });
  }
  return true;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (typeof payload === "string" || payload.role !== "admin") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      res.on("finish", () => {
        void logActivity({
          req,
          action: activityAction(req.method, req.path),
          statusCode: res.statusCode,
        });
      });
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function activityAction(method: string, path: string): string {
  if (path.includes("settings")) return "Settings Changed";
  if (path.includes("pending-payments")) return "Payment Updated";
  if (path.includes("packages")) return "Package Updated";
  if (path.includes("gallery")) return "Gallery Updated";
  if (path.includes("categories")) return "Category Updated";
  if (path.includes("posts")) return "Post Updated";
  if (path.includes("video-call")) return "Video Call Updated";
  if (path.includes("users")) return "User Updated";
  if (path.includes("referral")) return "Referral Updated";
  if (path.includes("backup")) return method === "GET" ? "Database Backup Downloaded" : "Database Backup";
  if (path.includes("webhook")) return "Webhook Updated";
  if (path.includes("password")) return "Password Changed";
  if (path.includes("broadcast")) return "Broadcast Sent";
  return `${method} ${path}`;
}
