FROM node:22.12-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:22.12-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV NEXT_PUBLIC_SERVER_URL=http://server:5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]