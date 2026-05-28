# syntax=docker/dockerfile:1.7

# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Vite bakes import.meta.env.VITE_* into the bundle at build time.
# Override at build with: --build-arg VITE_API_BASE_URL=https://streamer.example
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Console version baked into the bundle. The release workflow passes the
# pushed git tag here; self-builds leave it empty and fall back to the
# package.json version (see vite.config.ts).
ARG APP_VERSION=
ENV APP_VERSION=${APP_VERSION}

COPY . .
RUN npm run build

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
