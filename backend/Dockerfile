# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Install all deps (including dev) for typecheck
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and run typecheck
COPY src ./src
RUN npm run typecheck

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy only source files (no tests, no config files)
COPY src ./src

# Non-root user
USER node

ENV NODE_ENV=production
EXPOSE 3000

# Direct node command (no npm start wrapper)
CMD ["node", "--experimental-strip-types", "src/server.ts"]