# ─── Multi-Stage Dockerfile for Sync Frontend ─────────────────────────────

# Stage 1: Build & Bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Clean install dependencies
RUN npm ci

# Copy frontend source files
COPY index.html tsconfig.json vite.config.ts ./
COPY src/ ./src/

# Build static production bundle using Vite (output to dist/)
RUN npm run build

# ─── Stage 2: Serve with NGINX ─────────────────────────────────────────────
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
