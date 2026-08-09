# Debian slim, not Alpine: Prisma's engine binaries need glibc + a detectable OpenSSL
# version. Alpine (musl) needs extra binaryTargets config and still trips on OpenSSL
# auto-detection: https://www.prisma.io/docs/orm/prisma-client/deployment/traditional
FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN groupadd --gid 1001 nodejs && useradd --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
# Runs pending Prisma migrations against DATABASE_URL, then starts the server. Baked
# into the image (rather than a host-specific "release command") so it works the same
# way on any Docker host. Invokes the CLI's entry file directly since there's no
# node_modules/.bin symlink for a non-globally-installed `prisma` package.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
