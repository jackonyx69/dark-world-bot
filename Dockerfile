FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

COPY --from=builder /app /app

EXPOSE 5000

CMD ["pnpm", "run", "start"]
