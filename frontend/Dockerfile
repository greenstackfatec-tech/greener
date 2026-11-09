FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Intervalo de atualização do dashboard (segundos); vazio usa o padrão do código.
ARG VITE_INTERVALO_ATUALIZACAO_SEGUNDOS
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
