import { Router, type IRouter } from "express";
import { db, postsTable, postBlocksTable, postCategoriesTable, categoriesTable, usersTable, adProgressTable } from "@workspace/db";
import { and, eq, inArray, desc, asc, sql } from "drizzle-orm";
import { serialize } from "../utils/serialize";
import { verifyTelegramWebAppInitData } from "../utils/telegram";
import {
  ListPostsQueryParams,
  ListPostsResponse,
  GetPostParams,
  GetPostResponse,
  LikePostParams,
  ListCategoriesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const cats = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.name));
  const withCount = await Promise.all(cats.map(async (c) => {
    const [r] = await db.select({ cnt: sql<number>`count(*)` }).from(postCategoriesTable).where(eq(postCategoriesTable.categoryId, c.id));
    return { ...c, postCount: Number(r.cnt) };
  }));
  res.json(ListCategoriesResponse.parse(serialize(withCount)));
});

router.get("/posts", async (req, res): Promise<void> => {
  try {
    const parsed = ListPostsQueryParams.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const { section, category, search } = parsed.data;

    let posts = await db.select().from(postsTable).where(eq(postsTable.isActive, true)).orderBy(
      asc(postsTable.pinOrder), desc(postsTable.createdAt)
    );

    if (section) posts = posts.filter(p => p.sections.includes(section));
    if (search) posts = posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

    const postIds = posts.map(p => p.id);
    let allCatLinks: Array<typeof postCategoriesTable.$inferSelect> = [];
    let allCategories: Array<typeof categoriesTable.$inferSelect> = [];
    let allVideoBlocks: Array<typeof postBlocksTable.$inferSelect> = [];

    if (postIds.length > 0) {
      allCatLinks = await db.select().from(postCategoriesTable).where(inArray(postCategoriesTable.postId, postIds));
      allCategories = await db.select().from(categoriesTable);
      allVideoBlocks = await db.select().from(postBlocksTable).where(
        and(inArray(postBlocksTable.postId, postIds), eq(postBlocksTable.blockType, "video"))
      ).orderBy(asc(postBlocksTable.sortOrder));
    }

    const catMap = new Map(allCategories.map(c => [c.id, c]));
    const postCatMap = new Map<number, Array<typeof categoriesTable.$inferSelect>>();
    for (const link of allCatLinks) {
      const cat = catMap.get(link.categoryId);
      if (cat) {
        const list = postCatMap.get(link.postId) || [];
        list.push(cat);
        postCatMap.set(link.postId, list);
      }
    }

    const videoMap = new Map<number, string>();
    for (const block of allVideoBlocks) {
      if (!videoMap.has(block.postId) && block.content) {
        videoMap.set(block.postId, block.content);
      }
    }

    const withMeta = posts.map((p) => {
      const cats = postCatMap.get(p.id) || [];
      if (category && !cats.some(c => c.slug === category)) return null;
      const isRestricted = p.accessType === "ads" || p.sections.includes("paid");
      const videoUrl = isRestricted ? null : (videoMap.get(p.id) || null);
      return { ...p, videoUrl, categories: cats };
    });

    const filtered = withMeta.filter(Boolean);
    res.json(ListPostsResponse.parse(serialize(filtered)));
  } catch (err) {
    console.error("GET /posts error:", err);
    res.status(500).json({ error: (err as any)?.message || String(err) });
  }
});

router.get("/posts/:slug", async (req, res): Promise<void> => {
  const rawSlug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const params = GetPostParams.safeParse({ slug: rawSlug });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [post] = await db.select().from(postsTable).where(
    and(eq(postsTable.slug, params.data.slug), eq(postsTable.isActive, true))
  );
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  await db.update(postsTable).set({ viewCount: post.viewCount + 1 }).where(eq(postsTable.id, post.id));

  const telegramUser = verifyTelegramWebAppInitData(req.get("X-Telegram-Init-Data"));
  const [user] = telegramUser
    ? await db.select({ isPremium: usersTable.isPremium, premiumExpiresAt: usersTable.premiumExpiresAt })
        .from(usersTable)
        .where(eq(usersTable.telegramId, telegramUser.id))
    : [];
  const hasPremium = Boolean(
    user?.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date())
  );
  let hasAdUnlock = false;
  if (telegramUser && post.accessType === "ads" && !hasPremium && !post.sections.includes("paid")) {
    const [progress] = await db.select().from(adProgressTable).where(
      and(
        eq(adProgressTable.userId, telegramUser.id),
        eq(adProgressTable.postId, post.id),
      )
    );
    hasAdUnlock = Boolean(
      progress?.isUnlocked &&
      progress.lastAdWatchedAt &&
      Date.now() - progress.lastAdWatchedAt.getTime() < 24 * 60 * 60 * 1000
    );
  }
  const requiresPremium = post.sections.includes("paid") && !hasPremium;
  const requiresAds = post.accessType === "ads" && !post.sections.includes("paid") && !hasPremium && !hasAdUnlock;
  const blocks = requiresPremium || requiresAds
    ? []
    : await db.select().from(postBlocksTable).where(eq(postBlocksTable.postId, post.id)).orderBy(postBlocksTable.sortOrder);
  const catLinks = await db.select().from(postCategoriesTable).where(eq(postCategoriesTable.postId, post.id));
  let cats: typeof categoriesTable.$inferSelect[] = [];
  if (catLinks.length > 0) {
    cats = await db.select().from(categoriesTable).where(inArray(categoriesTable.id, catLinks.map(c => c.categoryId)));
  }

  const videoUrl = blocks.find((b) => b.blockType === "video")?.content || null;
  res.json(GetPostResponse.parse(serialize({ ...post, videoUrl, viewCount: post.viewCount + 1, blocks, categories: cats })));
});

router.post("/posts/:id/like", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = LikePostParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const [updated] = await db.update(postsTable).set({ likeCount: post.likeCount + 1 }).where(eq(postsTable.id, params.data.id)).returning();
  res.json({ likeCount: updated.likeCount });
});

export default router;
