# ==========================================
# Multi-stage Dockerfile for Cashback Hub Web & PWA
# ==========================================

# 1. Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code and public assets
COPY . .

# Build web static bundle
RUN npx expo export --platform web

# Copy public PWA assets and icons directly into dist
RUN cp -r public/* dist/ 2>/dev/null || true
RUN mkdir -p dist/assets && cp -r assets/* dist/assets/ 2>/dev/null || true

# Inject PWA meta tags and manifest link into index.html
RUN node scripts/inject-pwa.js

# 2. Production Stage (Nginx Alpine)
FROM nginx:alpine

# Copy built web assets to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
