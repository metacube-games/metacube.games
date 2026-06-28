FROM oven/bun:alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

COPY . .

# Public-by-design build-time values baked into the JS bundle (visible to
# any browser — NEXT_PUBLIC_*). Passed via --build-arg in CI; written to
# .env.production so Next.js picks them up at `bun run build`.
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
RUN printf '%s\n' \
    "NEXT_PUBLIC_BACKEND_URL=\"${NEXT_PUBLIC_BACKEND_URL}\"" \
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID=\"${NEXT_PUBLIC_GOOGLE_CLIENT_ID}\"" \
    > .env.production

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
