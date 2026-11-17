# --- build stage: full node image so native modules (better-sqlite3, argon2)
# compile from source if a prebuilt binary is unavailable ---
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src

# --- runtime stage: slim image, non-root ---
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY package.json ./

# Writable data dir owned by the unprivileged 'node' user.
RUN mkdir -p /data && chown -R node:node /data
USER node
ENV DB_PATH=/data/securenotes.db PORT=4000
EXPOSE 4000
CMD ["node", "src/server.js"]
