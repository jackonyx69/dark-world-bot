# Dark Would Expose

Full source workspace for the Telegram-oriented content app, including its React/Vite interface, Express API, PostgreSQL/Drizzle schema, and admin panel.

## Project root

After extracting the source archive, the project root is the `Dark-Would-Expose-source/` directory. It contains the root `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`.

## Requirements

- Node.js 24.x (the project requires Node.js 20 or newer)
- pnpm 10.26.1
- PostgreSQL

The app uses the managed `DATABASE_URL` when run on Replit. Outside Replit, set `DATABASE_URL` to your PostgreSQL connection string.

## Install

From the project root:

```sh
corepack enable
corepack prepare pnpm@10.26.1 --activate
pnpm install --frozen-lockfile
```

The root `pnpm-lock.yaml` is the workspace lockfile. Do not use npm or Yarn for this workspace.

## Configure environment

```sh
cp .env.example .env
```

Fill in the blank values in `.env` locally. Do not commit or export `.env`; only `.env.example` is included in this source bundle.

Required for the web app:

- `DATABASE_URL` — PostgreSQL connection string
- `ADMIN_PASSWORD` — password used at `/admin`
- `SESSION_SECRET` — secret used to sign admin sessions
- `PORT` — HTTP port

`TELEGRAM_BOT_TOKEN` is needed for Telegram bot operations. `TELEGRAM_WEBHOOK_URL` and `MONETAG_POSTBACK_SECRET` are used by their corresponding optional integrations. Other variables are optional and have app defaults where applicable.

Load `.env` into the shell before running commands:

```sh
set -a
. ./.env
set +a
```

## Database setup

The Drizzle schema is in `artifacts/dark-would-expose/models/`. Apply it to the database named by `DATABASE_URL`:

```sh
pnpm --filter @workspace/dark-would-expose run db:push
```

This project does not include standalone migration or seed files; `db:push` applies the schema directly. Use a development database for local work and back up an existing database before applying schema changes.

## Development

The app serves the Vite frontend and Express API from the same process. After loading `.env`, run:

```sh
PORT=3000 pnpm --filter @workspace/dark-would-expose run dev
```

Open `http://localhost:3000/`; the admin login is at `http://localhost:3000/admin`. API routes are under `/api`.

## Typecheck and production build

```sh
pnpm --filter @workspace/dark-would-expose run typecheck
pnpm --filter @workspace/dark-would-expose run build
```

The production frontend is written to `artifacts/dark-would-expose/dist/public/`.

## Production start

After loading `.env` and building:

```sh
NODE_ENV=production PORT=3000 pnpm --filter @workspace/dark-would-expose run start
```

The server defaults `WEB_DIST_DIR` to the built frontend directory and `UPLOADS_DIR` to `artifacts/dark-would-expose/public/uploads/`.

## Authentication and files

Admin credentials are configured with `ADMIN_PASSWORD` and `SESSION_SECRET`. Admin password hashes are stored in PostgreSQL. The source bundle contains no secret values.

Admin-uploaded files currently use the server's local `public/uploads` directory. Use a persistent disk or object storage when deploying to an environment with ephemeral filesystems.

## Vercel and v0

This bundle is a pnpm workspace with a long-running Express server, not a Next.js project or a Vercel serverless-function conversion. It runs as-is on a Node.js host that supports a persistent process. Deploying the API on Vercel requires a serverless adapter; uploaded files also need persistent object storage. No API behavior or UI has been replaced with mocks in this export.

## Workspace contents

`SOURCE_TREE.txt` lists the complete exported file tree. The archive includes the hidden project configuration files and public assets. It excludes Git history, dependencies, local Replit conversation/skill data, caches, and generated build output.
