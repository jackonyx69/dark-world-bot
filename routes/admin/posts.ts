import { Router, type IRouter } from "express";
import {
  db,
  postsTable,
  postBlocksTable,
  postCategoriesTable,
  categoriesTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import {
  ListAdminPostsResponse,
  CreatePostBody,
  GetAdminPostParams,
  GetAdminPostResponse,
  UpdatePostParams,
  UpdatePostBody,
  UpdatePostResponse,
  DeletePostParams,
  ListPostBlocksParams,
  ListPostBlocksResponse,
  CreatePostBlockParams,
  CreatePostBlockBody,
  UpdatePostBlockParams,
  UpdatePostBlockBody,
  UpdatePostBlockResponse,
  DeletePostBlockParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middleware/admin-auth";
import { serialize } from "../../utils/serialize";
import { getTelegramBotToken, sendTelegramMessage } from "../../utils/telegram";

const router: IRouter = Router();

type PostBlockInput = {
  blockType: string;
  content: string;
  sortOrder?: number;
};

async function syncPostRelations(
  postId: number,
  categoryIds: number[] | undefined,
  blocks: PostBlockInput[] | undefined,
) {
  if (categoryIds !== undefined) {
    await db.delete(postCategoriesTable).where(eq(postCategoriesTable.postId, postId));
    if (categoryIds.length > 0) {
      await db.insert(postCategoriesTable).values(
        categoryIds.map((categoryId) => ({ postId, categoryId })),
      );
    }
  }

  if (blocks !== undefined) {
    await db.delete(postBlocksTable).where(eq(postBlocksTable.postId, postId));
    if (blocks.length > 0) {
      await db.insert(postBlocksTable).values(
        blocks.map((block, index) => ({
          postId,
          blockType: block.blockType,
          content: block.content,
          sortOrder: block.sortOrder ?? index,
        })),
      );
    }
  }
}

async function notifyUsersAboutPost(title: string, description: string | null | undefined) {
  if (!getTelegramBotToken()) return;
  const recipients = await db
    .select({ telegramId: usersTable.telegramId })
    .from(usersTable);
  const message =
    `🔥 <b>নতুন পোস্ট প্রকাশিত হয়েছে!</b>\n\n` +
    `🎬 <b>${title}</b>\n` +
    (description ? `📝 <i>${description}</i>\n\n` : "\n") +
    "নতুন কন্টেন্ট দেখতে অ্যাপে প্রবেশ করুন!";
  for (const recipient of recipients) {
    await sendTelegramMessage(recipient.telegramId, message);
  }
}

async function getPostWithMeta(postId: number) {
  const post = await db.select().from(postsTable).where(eq(postsTable.id, postId)).then(r => r[0]);
  if (!post) return null;
  const blocks = await db.select().from(postBlocksTable).where(eq(postBlocksTable.postId, postId)).orderBy(postBlocksTable.sortOrder);
  const catLinks = await db.select().from(postCategoriesTable).where(eq(postCategoriesTable.postId, postId));
  let cats: typeof categoriesTable.$inferSelect[] = [];
  if (catLinks.length > 0) {
    cats = await db.select().from(categoriesTable).where(inArray(categoriesTable.id, catLinks.map(c => c.categoryId)));
  }
  const videoUrl = blocks.find((block) => block.blockType === "video")?.content || null;
  return { ...post, videoUrl, blocks, categories: cats };
}

router.get("/admin/posts", requireAdmin, async (_req, res): Promise<void> => {
  const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt));
  const postIds = posts.map(p => p.id);

  let allCatLinks: Array<typeof postCategoriesTable.$inferSelect> = [];
  let allCategories: Array<typeof categoriesTable.$inferSelect> = [];
  let allBlocks: Array<typeof postBlocksTable.$inferSelect> = [];

  if (postIds.length > 0) {
    allCatLinks = await db.select().from(postCategoriesTable).where(inArray(postCategoriesTable.postId, postIds));
    allCategories = await db.select().from(categoriesTable);
    allBlocks = await db.select().from(postBlocksTable).where(inArray(postBlocksTable.postId, postIds)).orderBy(postBlocksTable.sortOrder);
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

  const postBlocksMap = new Map<number, Array<typeof postBlocksTable.$inferSelect>>();
  for (const block of allBlocks) {
    const list = postBlocksMap.get(block.postId) || [];
    list.push(block);
    postBlocksMap.set(block.postId, list);
  }

  const withMeta = posts.map((p) => {
    const blocks = postBlocksMap.get(p.id) || [];
    const videoUrl = blocks.find((block) => block.blockType === "video")?.content || null;
    return { ...p, videoUrl, blocks, categories: postCatMap.get(p.id) || [] };
  });

  res.json(ListAdminPostsResponse.parse(serialize(withMeta)));
});

router.post("/admin/posts", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const {
    categoryIds,
    blocks,
    notifyUsers,
    isPinned,
    pinOrder,
    ...input
  } = parsed.data as typeof parsed.data & {
    categoryIds?: number[];
    blocks?: PostBlockInput[];
    notifyUsers?: boolean;
    isPinned?: boolean;
    pinOrder?: number;
  };
  const postData = {
    ...input,
    slug: input.slug || input.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""),
    pinOrder: isPinned === false ? null : (pinOrder ?? (isPinned ? 1 : undefined)),
  };
  const [post] = await db.insert(postsTable).values(postData).returning();
  await syncPostRelations(post.id, categoryIds, blocks);
  if (notifyUsers) {
    void notifyUsersAboutPost(post.title, post.description);
  }
  const full = await getPostWithMeta(post.id);
  res.status(201).json(GetAdminPostResponse.parse(serialize(full)));
});

router.get("/admin/posts/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAdminPostParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const full = await getPostWithMeta(params.data.id);
  if (!full) { res.status(404).json({ error: "Post not found" }); return; }
  res.json(GetAdminPostResponse.parse(serialize(full)));
});

router.patch("/admin/posts/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePostParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePostBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const {
    categoryIds,
    blocks,
    notifyUsers,
    isPinned,
    pinOrder,
    ...input
  } = parsed.data as typeof parsed.data & {
    categoryIds?: number[];
    blocks?: PostBlockInput[];
    notifyUsers?: boolean;
    isPinned?: boolean;
    pinOrder?: number;
  };
  const updateData = {
    ...input,
    ...(isPinned !== undefined || pinOrder !== undefined
      ? { pinOrder: isPinned === false ? null : (pinOrder ?? (isPinned ? 1 : undefined)) }
      : {}),
  };
  const [post] = await db.update(postsTable).set(updateData).where(eq(postsTable.id, params.data.id)).returning();
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  await syncPostRelations(post.id, categoryIds, blocks);
  if (notifyUsers) {
    void notifyUsersAboutPost(post.title, post.description);
  }
  const full = await getPostWithMeta(post.id);
  res.json(UpdatePostResponse.parse(serialize(full)));
});

router.delete("/admin/posts/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePostParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(postCategoriesTable).where(eq(postCategoriesTable.postId, params.data.id));
  await db.delete(postBlocksTable).where(eq(postBlocksTable.postId, params.data.id));
  const [post] = await db.delete(postsTable).where(eq(postsTable.id, params.data.id)).returning();
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  res.sendStatus(204);
});

router.get("/admin/posts/:postId/blocks", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const params = ListPostBlocksParams.safeParse({ postId: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const blocks = await db.select().from(postBlocksTable).where(eq(postBlocksTable.postId, params.data.postId)).orderBy(postBlocksTable.sortOrder);
  res.json(ListPostBlocksResponse.parse(serialize(blocks)));
});

router.post("/admin/posts/:postId/blocks", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const params = CreatePostBlockParams.safeParse({ postId: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = CreatePostBlockBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [block] = await db.insert(postBlocksTable).values({ ...parsed.data, postId: params.data.postId }).returning();
  res.status(201).json(block);
});

router.patch("/admin/posts/:postId/blocks/:blockId", requireAdmin, async (req, res): Promise<void> => {
  const rawPostId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const rawBlockId = Array.isArray(req.params.blockId) ? req.params.blockId[0] : req.params.blockId;
  const params = UpdatePostBlockParams.safeParse({ postId: parseInt(rawPostId, 10), blockId: parseInt(rawBlockId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePostBlockBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [block] = await db.update(postBlocksTable).set(parsed.data).where(eq(postBlocksTable.id, params.data.blockId)).returning();
  if (!block) { res.status(404).json({ error: "Block not found" }); return; }
  res.json(UpdatePostBlockResponse.parse(serialize(block)));
});

router.delete("/admin/posts/:postId/blocks/:blockId", requireAdmin, async (req, res): Promise<void> => {
  const rawBlockId = Array.isArray(req.params.blockId) ? req.params.blockId[0] : req.params.blockId;
  const params = DeletePostBlockParams.safeParse({ postId: 0, blockId: parseInt(rawBlockId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [block] = await db.delete(postBlocksTable).where(eq(postBlocksTable.id, params.data.blockId)).returning();
  if (!block) { res.status(404).json({ error: "Block not found" }); return; }
  res.sendStatus(204);
});

export default router;
