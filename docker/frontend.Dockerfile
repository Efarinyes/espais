FROM node:22-bookworm-slim AS build

WORKDIR /src

COPY frontend/package.json frontend/package-lock.json ./
COPY frontend/patches ./patches
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM caddy:2-alpine

COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/dist /srv
