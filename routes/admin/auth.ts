import { Router, type IRouter } from "express";
import { AdminLoginBody, AdminLoginResponse } from "@workspace/api-zod";
import { signAdminToken, verifyAdminPassword, changeAdminPassword, requireAdmin } from "../../middleware/admin-auth";
import { logActivity } from "../../utils/activity";

const router: IRouter = Router();

interface AttemptTracker {
  count: number;
  blockedUntil: number;
}
const loginAttempts = new Map<string, AttemptTracker>();

function checkRateLimit(ip: string): { allowed: boolean; remainingSeconds?: number } {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  if (record.blockedUntil > Date.now()) {
    return {
      allowed: false,
      remainingSeconds: Math.ceil((record.blockedUntil - Date.now()) / 1000),
    };
  }

  if (record.blockedUntil > 0 && record.blockedUntil <= Date.now()) {
    loginAttempts.delete(ip);
  }

  return { allowed: true };
}

function recordFailedAttempt(ip: string): void {
  const record = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.blockedUntil = Date.now() + 15 * 60 * 1000; // Block for 15 minutes
  }
  loginAttempts.set(ip, record);
}

function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const clientIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.status(429).json({
      error: `Too many failed login attempts. Please try again after ${rateLimit.remainingSeconds} seconds.`,
    });
    return;
  }

  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!(await verifyAdminPassword(parsed.data.password))) {
    recordFailedAttempt(clientIp);
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  clearFailedAttempts(clientIp);
  const token = signAdminToken();
  await logActivity({ req, action: "Admin Login", statusCode: 200 });
  res.json(AdminLoginResponse.parse({ success: true, token }));
});

router.post("/admin/logout", requireAdmin, async (req, res): Promise<void> => {
  await logActivity({ req, action: "Admin Logout", statusCode: 200 });
  res.json({ success: true });
});

router.post("/admin/password", requireAdmin, async (req, res): Promise<void> => {
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || typeof confirmPassword !== "string") {
    res.status(400).json({ error: "All password fields are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }
  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: "New passwords do not match" });
    return;
  }
  if (!(await changeAdminPassword(currentPassword, newPassword))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  await logActivity({ req, action: "Password Changed", statusCode: 200 });
  res.json({ success: true });
});

export default router;
