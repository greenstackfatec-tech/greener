# Estágio de build
FROM node:24-alpine AS build
WORKDIR /app

# Copia dependências primeiro para cachear
COPY package.json package-lock.json ./
RUN npm ci

# Copia tsconfig para o build (project references)
COPY tsconfig*.json ./

# Copia todo o restante (incluindo vite.config.ts, src)
COPY . .

# Roda o build
RUN npm run build

# Estágio final (Nginx)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80