# ================================================================
#  FIE Explorer 3D — Backend Dockerfile
#  Base: Node.js 18 LTS Alpine
#  Stages: development | production
# ================================================================

# ── Stage base ────────────────────────────────────────────────
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./
EXPOSE 4000

# ── Stage development ─────────────────────────────────────────
FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
CMD ["dumb-init", "node_modules/.bin/nodemon", "server.js"]

# ── Stage production ──────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
RUN npm ci --only=production
COPY . .
USER node
CMD ["dumb-init", "node", "server.js"]
