import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  postsTable, usersTable, categoriesTable, socialLinksTable,
  pendingPaymentsTable,
} from "@workspace/db";
import { count, sql } from "drizzle-orm";
import { GetAdminStatsResponse } from "@workspace/api-zod";
import { requireAdmin } from "../../middleware/admin-auth";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [postsResult] = await db.select({ total: count() }).from(postsTable);
  const [usersResult] = await db.select({ total: count() }).from(usersTable);
  const [catResult] = await db.select({ total: count() }).from(categoriesTable);
  const [socialResult] = await db.select({ total: count() }).from(socialLinksTable);

  const [viewsResult] = await db.select({
    total: sql<number>`coalesce(sum(${postsTable.viewCount}), 0)`,
  }).from(postsTable);

  const [premiumResult] = await db.select({ total: count() }).from(usersTable).where(
    sql`${usersTable.isPremium} = true`
  );

  const [pendingResult] = await db.select({ total: count() }).from(pendingPaymentsTable).where(
    sql`${pendingPaymentsTable.status} = 'pending'`
  );
  const [revenueResult] = await db.select({
    total: sql<number>`coalesce(sum(cast(${pendingPaymentsTable.amount} as numeric)), 0)`,
  }).from(pendingPaymentsTable).where(sql`${pendingPaymentsTable.status} = 'approved'`);

  const [homeResult] = await db.select({ total: count() }).from(postsTable).where(
    sql`${postsTable.sections} LIKE '%home%'`
  );
  const [freeResult] = await db.select({ total: count() }).from(postsTable).where(
    sql`${postsTable.sections} LIKE '%free%'`
  );
  const [paidResult] = await db.select({ total: count() }).from(postsTable).where(
    sql`${postsTable.sections} LIKE '%paid%'`
  );

  res.json(GetAdminStatsResponse.parse({
    totalPosts: postsResult.total,
    totalViews: Number(viewsResult.total),
    totalUsers: usersResult.total,
    homePosts: homeResult.total,
    freePosts: freeResult.total,
    paidPosts: paidResult.total,
    totalCategories: catResult.total,
    totalSocialLinks: socialResult.total,
    premiumUsers: premiumResult.total,
    pendingPayments: pendingResult.total,
    revenue: Number(revenueResult.total),
    todayVisitors: 0,
  }));
});

export default router;
