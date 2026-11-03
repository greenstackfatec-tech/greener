# Estágio de build
FROM node:22.16.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run typecheck

# Estágio de produção
FROM node:22.16.0-alpine
WORKDIR /app
ENV NODE_ENV=production
# Copia dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
# Copia código fonte
COPY src ./src

USER node
EXPOSE 3000
CMD ["node", "--experimental-strip-types", "src/server.ts"]