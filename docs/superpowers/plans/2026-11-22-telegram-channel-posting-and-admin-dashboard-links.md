# Telegram Channel Auto-Posting & Admin Dashboard Interactive Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable automatic Telegram channel broadcasting on post creation/update with thumbnail, title, description, and an inline `Watch Now` button opening the Mini App, and make all Admin Dashboard stat cards clickable links with matching filter views.

**Architecture:** 
1. Expand Telegram helper utilities in `utils/telegram.ts` to support posting photos and messages with inline Web App buttons to configured Telegram channels.
2. Update post creation/update routes in `routes/admin/posts.ts` to handle `postToChannel` and execute the channel broadcast.
3. Update `client/src/pages/admin/PostForm.tsx` to include the `postToChannel` control checkbox (default true).
4. Update `client/src/pages/admin/Dashboard.tsx` to wrap each stat card in interactive `wouter` `<Link>` components pointing to respective admin destinations with query params.
5. Update `client/src/pages/admin/Posts.tsx`, `Users.tsx`, and `Payments.tsx` to parse URL query parameters on mount to activate corresponding filters.

**Tech Stack:** Express, Node.js fetch / Telegram Bot API, React 19, TypeScript, TailwindCSS, wouter.

**Spec:** [docs/superpowers/specs/2026-11-22-telegram-channel-posting-and-admin-dashboard-links-design.md](file:///workspace/bright-faraday/docs/superpowers/specs/2026-11-22-telegram-channel-posting-and-admin-dashboard-links-design.md)

## Global Constraints
- Active workspace: `/workspace/bright-faraday`.
- Must compile cleanly with `pnpm run typecheck`.
- Telegram Mini App link format: `https://t.me/<botUsername>/app?startapp=post_<slug>`.
- Default bot username fallback: `Dark_Would_Expose_bot`.

## Review Focus
1. Telegram channel identifier resolution: handles `@username`, `-100...` numeric ID, or full `https://t.me/...` URL.
2. Photo post vs Text fallback: if thumbnail URL is missing, invalid, or fails to fetch, gracefully falls back to `sendMessage` without crashing the post creation flow.
3. PostForm submission: sends `postToChannel: boolean` to the API.
4. Dashboard URL navigation: clicking cards smoothly navigates with wouter and updates filter state accordingly.
5. Types and build: zero TypeScript or build errors.

---

### Task 1: Telegram Channel Broadcasting Utility

**Files:**
- Modify: `utils/telegram.ts`

**Interfaces:**
- Produces: `sendTelegramChannelPost(params: { channelIdOrLink: string; title: string; description?: string | null; thumbnailUrl?: string | null; slug: string; botUsername?: string }): Promise<{ success: boolean; error?: string }>`
- Produces: `extractTelegramChannelId(channelLinkOrId: string): string | null`

- [ ] **Step 1: Write helper functions in `utils/telegram.ts`**
Add `extractTelegramChannelId` to normalize channel links (`https://t.me/example` -> `@example`, `@example` -> `@example`, `-100123...` -> `-100123...`).
Add `sendTelegramChannelPost` to send `sendPhoto` with photo, caption (title & description), and inline keyboard with `🎬 Watch Now` linking to `https://t.me/<botUsername>/app?startapp=post_<slug>`. Add fallback to `sendMessage` if `sendPhoto` fails.

- [ ] **Step 2: Typecheck verification**
Run: `pnpm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**
`git commit -am "feat: add Telegram channel auto-post utility with Watch Now button"`

---

### Task 2: Backend Post Route Integration for Channel Auto-Posting

**Files:**
- Modify: `routes/admin/posts.ts`

**Interfaces:**
- Consumes: `sendTelegramChannelPost` from `utils/telegram.ts`
- Consumes: `settingsTable` for `channelLink` and `chatId`
- Produces: updated `POST /api/admin/posts` and `PUT /api/admin/posts/:id` accepting `postToChannel?: boolean`

- [ ] **Step 1: Update post creation and update handlers in `routes/admin/posts.ts`**
Extract `postToChannel` from request body (default to true on creation if `channelLink` or `chatId` exists).
If `postToChannel` is true, invoke `sendTelegramChannelPost` asynchronously.
If `notifyUsers` is true, also notify registered users.

- [ ] **Step 2: Typecheck verification**
Run: `pnpm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**
`git commit -am "feat: trigger Telegram channel broadcast on post save"`

---

### Task 3: Admin Post Form Toggle & Settings Guidance

**Files:**
- Modify: `client/src/pages/admin/PostForm.tsx`
- Modify: `client/src/pages/admin/Settings.tsx`

**Interfaces:**
- Produces: `postToChannel` state and checkbox in `PostForm.tsx`
- Produces: clearer Telegram Channel configuration field and helper note in `Settings.tsx`

- [ ] **Step 1: Add `postToChannel` checkbox to `PostForm.tsx`**
Add `postToChannel: boolean` to form state (default `true` for new posts).
Add a visible checkbox and description in the "Publish controls" card: `Post to Telegram Channel`.

- [ ] **Step 2: Update `Settings.tsx` channel help text**
Clarify in `Settings.tsx` that the Telegram Channel can be entered as `@your_channel` or `https://t.me/your_channel`, and that the bot `@Dark_Would_Expose_bot` must be an admin with post permissions.

- [ ] **Step 3: Typecheck verification**
Run: `pnpm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**
`git commit -am "feat: add channel post toggle to PostForm and update Settings guidance"`

---

### Task 4: Interactive Admin Dashboard Stat Cards

**Files:**
- Modify: `client/src/pages/admin/Dashboard.tsx`
- Modify: `client/src/pages/admin/Posts.tsx`
- Modify: `client/src/pages/admin/Users.tsx`
- Modify: `client/src/pages/admin/Payments.tsx`

**Interfaces:**
- `Dashboard.tsx`: links every stat card to its respective admin page.
- `Posts.tsx`, `Users.tsx`, `Payments.tsx`: parse `window.location.search` to apply initial filters from query parameters.

- [ ] **Step 1: Wrap stat cards in `Dashboard.tsx` with `<Link>`**
Update `statCards` definitions to include destination `href` values.
Render cards wrapped in `<Link href={stat.href}>` with hover and active states (`hover:border-primary/50 hover:shadow-md cursor-pointer transition-all`).

- [ ] **Step 2: Support URL query parameters in `Posts.tsx`**
Initialize `section` and `accessType` from `window.location.search` (e.g. `?section=home`, `?accessType=free`, `?accessType=paid`).

- [ ] **Step 3: Support URL query parameters in `Users.tsx`**
Add filter state (`filter = "all" | "premium"`), initialize from `?filter=premium`. Filter user list when premium filter is active.

- [ ] **Step 4: Support URL query parameters in `Payments.tsx`**
Initialize `statusFilter` from `?status=pending` or `?status=approved`.

- [ ] **Step 5: Typecheck verification & frontend build**
Run: `pnpm run typecheck && pnpm run build`
Expected: PASS

- [ ] **Step 6: Commit**
`git commit -am "feat: make admin dashboard cards clickable with active filters"`
