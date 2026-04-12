# ================================================================
#  FIE Explorer 3D — Frontend Dockerfile
#  Base: Node.js 18 LTS Alpine + Vite
#  Stages: development | production (Nginx)
# ================================================================

# ── Stage base ────────────────────────────────────────────────
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
EXPOSE 5173

# ── Stage development ─────────────────────────────────────────
FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Stage build ───────────────────────────────────────────────
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# ── Stage production (Nginx) ──────────────────────────────────
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
