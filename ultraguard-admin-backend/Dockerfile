FROM node:20-alpine AS base
WORKDIR /app

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
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
# `prisma migrate deploy` at boot needs the `prisma` CLI, which the Next.js standalone
# build doesn't trace/copy (only the generated @prisma/client is imported by app code).
RUN npm install -g prisma@5.19.1

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
# Runs pending Prisma migrations against DATABASE_URL, then starts the server. Baked
# into the image (rather than a host-specific "release command") so it works the same
# way on any Docker host.
CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
