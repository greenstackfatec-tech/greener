# Estágio de build
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
# Copia arquivos de configuração antes do código fonte
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY . .
RUN npm run build

# Estágio final (Nginx)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80