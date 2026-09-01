FROM node:20-alpine

WORKDIR /app

# Copy server code
COPY src/ ./src/
COPY package*.json ./

# Create data directory for volume persistence
RUN mkdir -p /app/data

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

CMD ["node", "src/server.js"]
