import { Router, type IRouter } from "express";
import { AdminLoginBody, AdminLoginResponse } from "@workspace/api-zod";
import { signAdminToken, verifyAdminPassword, changeAdminPassword, requireAdmin } from "../../middleware/admin-auth";
import { logActivity } from "../../utils/activity";

const router: IRouter = Router();

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!(await verifyAdminPassword(parsed.data.password))) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
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
