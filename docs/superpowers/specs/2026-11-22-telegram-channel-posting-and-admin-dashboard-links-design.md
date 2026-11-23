# Telegram Channel Auto-Posting & Admin Dashboard Interactive Links Design

## 1. Intent & Context
Dark Would Expose is a Telegram-oriented video/content platform with an Express backend, PostgreSQL database, and React frontend acting as a Telegram Mini App (`t.me/Dark_Would_Expose_bot/app`).

The administrative requirements are:
1. When publishing or editing a post with auto-posting enabled, automatically send a message to the configured Telegram channel containing the post's thumbnail (as photo), Title, Description, and an inline keyboard button `🎬 Watch Now` that opens the Mini App directly at `/post/:slug` via `https://t.me/Dark_Would_Expose_bot/app?startapp=post_<slug>`.
2. Turn all stat cards on the Admin Dashboard (`/admin/dashboard`) into clickable cards navigating directly to their corresponding admin pages and applied filter views.

## 2. Requirements & Goals

### Feature A: Telegram Channel Auto-Posting with "Watch Now" Button
- **Channel Target**: Resolve the target channel from `settings.channelLink` (e.g. `https://t.me/channel_name`, `@channel_name`) or `settings.chatId` (e.g. `-100...`).
- **Post Content**:
  - Image: Post thumbnail (`thumbnailUrl`). If remote or local, send via `sendPhoto` with HTML caption. If photo fails or no thumbnail, fallback to `sendMessage`.
  - Caption:
    ```html
    🎬 <b><title></b>

    📝 <i><description></i>

    🔥 <i>নতুন ভিডিও রিলিজ হয়েছে! এখনই দেখতে নিচের বাটনে ক্লিক করুন 👇</i>
    ```
  - Inline Button:
    `🎬 Watch Now` with direct Mini App deep link:
    `https://t.me/<botUsername>/app?startapp=post_<slug>`
- **Admin Control**:
  - On `PostForm.tsx`, add a checkbox `[x] Post to Telegram Channel` (checked by default for new posts) alongside the existing `[ ] Send Telegram notification` (to registered users).
  - Backend route `POST /api/admin/posts` and `PUT /api/admin/posts/:id` accepts `postToChannel?: boolean`. When true, triggers channel notification.
  - In Admin Settings (`Settings.tsx`), make Telegram Channel configuration clear with guidance on bot administrator permissions.

### Feature B: Admin Dashboard Clickable Stat Cards
- In `Dashboard.tsx`:
  - `Total Posts` -> `/admin/posts`
  - `Total Views` -> `/admin/posts`
  - `Total Users` -> `/admin/users`
  - `Home Posts` -> `/admin/posts?section=home`
  - `Free Posts` -> `/admin/posts?accessType=free`
  - `Paid Posts` -> `/admin/posts?accessType=paid`
  - `Categories` -> `/admin/categories`
  - `Social Links` -> `/admin/social-links`
  - `Premium Users` -> `/admin/users?filter=premium`
  - `Pending Payments` -> `/admin/payments?status=pending`
  - `Revenue` -> `/admin/payments?status=approved`
- Update destination pages (`Posts.tsx`, `Users.tsx`, `Payments.tsx`) to initialize their filters (`section`, `accessType`, `filter`, `statusFilter`) from URL query parameters (`window.location.search`).
- Add active card hover & click transitions.

## 3. Approaches Considered
- **Direct Telegram Channel Link vs Web Link for button**:
  - Web link (`https://domain/post/:slug`): doesn't stay in native Telegram Mini App viewport for mobile channel viewers.
  - Telegram Mini App link (`https://t.me/<bot>/app?startapp=post_<slug>`): natively opens the Mini App directly within Telegram, matching user expectations. (Chosen).
