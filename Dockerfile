# ==========================================
# Multi-stage Dockerfile for Cashback Hub Web
# ==========================================

# 1. Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (for layer caching)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build web static bundle
RUN npx expo export --platform web

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
