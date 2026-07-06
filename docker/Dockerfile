# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: Serve with Node.js
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY docker/server.js ./server.js
ENV PORT=80
ENV STATIC_DIR=/app/dist
ENV EXPORT_DIR=/exports
EXPOSE 80
CMD ["node", "server.js"]
