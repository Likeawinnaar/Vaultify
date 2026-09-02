FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN useradd --system --uid 1001 vaultify
COPY --from=builder --chown=vaultify:vaultify /app/.next/standalone ./
COPY --from=builder --chown=vaultify:vaultify /app/.next/static ./.next/static
COPY --from=builder --chown=vaultify:vaultify /app/db ./db
RUN mkdir -p /data && chown -R vaultify:vaultify /data
USER vaultify
EXPOSE 3000
CMD ["node", "server.js"]

