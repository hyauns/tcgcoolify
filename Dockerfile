FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js telemetry is disabled during the build
ENV NEXT_TELEMETRY_DISABLED=1

# Coolify passes SOURCE_COMMIT automatically; also accept COMMIT_SHA for manual builds
ARG COMMIT_SHA=unknown
ENV COMMIT_SHA=${COMMIT_SHA}

# Build the application
RUN BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
    && echo "COMMIT_SHA=${COMMIT_SHA}" \
    && echo "BUILD_TIME=${BUILD_TIME}" \
    && COMMIT_SHA=${COMMIT_SHA} BUILD_TIME=${BUILD_TIME} npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Version tracking — inherited from builder ARG
ARG COMMIT_SHA=unknown
ENV COMMIT_SHA=${COMMIT_SHA}
ARG BUILD_TIME=unknown
ENV BUILD_TIME=${BUILD_TIME}

# sharp requires libc6-compat on Alpine for native image processing
RUN apk add --no-cache libc6-compat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# NEXT_SHARP_PATH tells Next.js where to find the sharp native module
# for image optimization in standalone mode
ENV NEXT_SHARP_PATH=/app/node_modules/sharp

CMD ["node", "server.js"]
