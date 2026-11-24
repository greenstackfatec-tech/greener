# Imagem única para deploy (Render): frontend compilado + backend Node no mesmo container.
# Build a partir da raiz do repositório: docker build -f deploy/Dockerfile .

FROM node:24-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_INTERVALO_ATUALIZACAO_SEGUNDOS
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
COPY database/schema.sql database/seed.sql ./database/
COPY deploy/init-db.mjs deploy/server.mjs ./scripts/
COPY --from=frontend /app/dist ./public

USER node
ENV NODE_ENV=production
CMD ["node", "/app/scripts/server.mjs"]
