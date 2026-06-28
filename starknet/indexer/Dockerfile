FROM node:22-slim

WORKDIR /app

# Create persistent directory for state, owned by node user
RUN mkdir -p /persistent && chown node:node /persistent

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm ci

COPY index.ts .

# .env is loaded via docker-compose env_file, not copied into image

EXPOSE 8080

USER node

ENTRYPOINT ["npx", "tsx", "index.ts"]
