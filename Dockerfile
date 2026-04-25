# ============================================
# Stage 1: Dependencies
# ============================================
ARG NODE_VERSION=24.13.0-slim
FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ============================================
# Stage 2: Build
# ============================================
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Pass build arguments for client-side environment variables
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

ENV NODE_ENV=production
# Ensure next.config.js has { output: 'standalone' }
RUN npm run build

# ============================================
# Stage 3: Runner
# ============================================
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

# Install curl for the Healthcheck (Slim doesn't have it)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Standalone mode creates a folder that contains its own node_modules
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

# Updated Healthcheck to use curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start using node server.js (DO NOT use next start)
CMD ["node", "server.js"]