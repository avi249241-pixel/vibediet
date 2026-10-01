# Stage 1: Build client and server
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Ultra-lightweight Production Runtime (<150MB)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy pre-built frontend and compiled server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js

EXPOSE 8080

CMD ["node", "server.js"]
