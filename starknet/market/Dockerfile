FROM oven/bun:alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

COPY . .
RUN --mount=type=cache,target=/app/.next/cache bun run build

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000

USER node

CMD ["node", "server.js"]
