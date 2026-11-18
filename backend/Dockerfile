# ─── Multi-Stage Dockerfile for Sync Backend ──────────────────────────────

# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for TypeScript build)
RUN npm ci

# Copy TypeScript source code and configuration
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript into JavaScript (output to dist/)
RUN npm run build

# Prune development dependencies to keep final image slim
RUN npm prune --production

# ─── Stage 2: Production Runtime ───────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Create a non-root user and group for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production node_modules from builder
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy compiled JavaScript output from builder
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist

# Copy package manifest
COPY --from=builder --chown=appuser:appgroup /app/package*.json ./

# Switch to the non-root user
USER appuser

# Expose backend service port
EXPOSE 5000

# Start Express server
CMD ["node", "dist/index.js"]
