FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate --schema prisma/schema.prisma

FROM deps AS build
WORKDIR /app

COPY tsconfig.json tsconfig.build.json nest-cli.json eslint.config.mjs ./
COPY src ./src

RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY package.json ./package.json
COPY tsconfig.json ./tsconfig.json
COPY tsconfig.build.json ./tsconfig.build.json

EXPOSE 3000

# Startup resiliente:
# - espera porta do SQL Server
# - tenta migrate/seed com retries (SQL Server pode abrir a porta antes de aceitar logins)
CMD ["sh", "-c", "set -e; for i in $(seq 1 90); do nc -z mssql 1433 && echo \"SQL Server pronto\" && break; echo \"Aguardando SQL Server (mssql:1433)...\"; sleep 2; done; for i in $(seq 1 30); do npx prisma migrate deploy --schema prisma/schema.prisma && break; echo \"Aguardando migrações...\"; sleep 2; done; for i in $(seq 1 30); do npx prisma db seed --schema prisma/schema.prisma && break; echo \"Aguardando seed...\"; sleep 2; done; node dist/main.js"]


