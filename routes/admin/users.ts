import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListAdminUsersQueryParams, ListAdminUsersResponse,
  UpdateUserPremiumParams, UpdateUserPremiumBody, UpdateUserPremiumResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middleware/admin-auth";
import { serialize } from "../../utils/serialize";

const router: IRouter = Router();

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ListAdminUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(ListAdminUsersResponse.parse(serialize(users)));
});

router.patch("/admin/users/:id/premium", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateUserPremiumParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateUserPremiumBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {
    isPremium: parsed.data.isPremium,
  };
  if (parsed.data.packageType !== undefined) updateData.packageType = parsed.data.packageType;
  if (parsed.data.premiumExpiresAt !== undefined) {
    updateData.premiumExpiresAt = parsed.data.premiumExpiresAt ? new Date(parsed.data.premiumExpiresAt) : null;
  }

  const [user] = await db.update(usersTable).set(updateData as any).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(UpdateUserPremiumResponse.parse(serialize(user)));
});

export default router;
