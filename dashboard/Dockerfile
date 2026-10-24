# -- Build ---------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Baked into the JS bundle at build time; public by design (no secrets in VITE_*).
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL build arg is required" && exit 1)
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# -- Runtime: static files from an unprivileged nginx (listens on 8080) ----------
FROM nginxinc/nginx-unprivileged:1-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
