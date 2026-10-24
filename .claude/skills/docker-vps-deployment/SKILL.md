---
name: docker-vps-deployment
description: Use when changing a Dockerfile, docker-compose.yml, GitHub Actions CI/CD, VPS deployment scripts, Nginx assumptions, environment variables, ports, or deployment notes for the backend or dashboard.
---

Nothing is deployed yet. The first deploy is part of phase 1. This is the planned setup (`AGENTS.md`, `docs/PLAN.md` §3):

* **Shared VPS.** The project runs on the VPS that also hosts SponsorDirect. It must not touch SponsorDirect's containers, network, volumes, or Nginx sites.
* **Own Compose project and network.** Its own `docker-compose.yml` in its own directory on the VPS, its own Compose project name and its own Docker network. Do not join `sponsorDirect-network`.
* **Ports.** Backend container port `8081`, host port `8099` (`8099:8081`). Dashboard nginx container, host port `8100`. Other apps hold 8001, 8002 and every port from 8080 to 8098 (checked 2026-10-24). Run `ss -tlnp` on the VPS before the first deploy and before any port change: an undocumented app once silently held a port that the docs said was free.
* **Own Postgres.** Service name `postgres`, image `postgres:17`, its own named volume, not published on any host port.
* **Dashboard** is a static Vite build served by a small nginx container.
* **Mobile is not deployed to the VPS.** It is built with EAS Build; only the API base URL points at the VPS ([[secrets-and-config-management]]).
* **No domain or HTTPS until phase 6.** Testing uses `http://<VPS_IP>:8099` and `:8100`. In phase 6, follow SponsorDirect's pattern: host Nginx proxies each domain to `127.0.0.1:8099` / `127.0.0.1:8100`, and certbot issues the certificates. Add new Nginx site files; never edit SponsorDirect's.
* **There is no staging environment.** Every push to `main` deploys straight to the VPS.

## Pipeline (GitHub Actions over SSH)

Same pattern as SponsorDirect: build and test → build and push images to Docker Hub tagged `:latest` and `:<commit-sha>` → SSH to the VPS → `docker compose pull && docker compose up -d` → `docker image prune -f`. Pull requests run build and tests only.

**Copy `docker-compose.yml` to the VPS in the workflow** (scp step) on every deploy. If the VPS copy is maintained by hand, compose changes (new env vars, healthchecks, limits) silently never reach production: `docker compose up -d` only reads the file already on disk. Do the same for any ops scripts.

## Rules

* Do not use `localhost` for database access from the backend container. `SERVER_PORT` stays `8081` in the container whatever the host port is.
* Never suggest `docker compose down -v` unless explicitly asked; it destroys the Postgres volume.
* Image tags must be well formed (`<user>/lighthouse-fellowship-backend:<tag>`), never `name:latest:latest`.
* Set memory and CPU limits on every service. The VPS is shared, so a leak here must not starve SponsorDirect. Check free memory before phase 1 (`free -h`, `docker stats`) and size the limits from real usage.
* Add log rotation to every service: `logging: {driver: json-file, options: {max-size: "10m", max-file: "3"}}`.
* Run the backend image as a non-root user with `JAVA_OPTS=-XX:MaxRAMPercentage=70` (or similar) so the JVM respects the container limit.
* Healthchecks: `pg_isready` for `postgres`; `/actuator/health` for the backend ([[observability-and-logging]]); the backend `depends_on` postgres `service_healthy`.
* Backups: Postgres volume is the only copy of the notes and visitor data. Plan a scheduled `pg_dump` to storage off the VPS and a tested restore; an untested backup is not a backup. Raise it as a gap until it exists ([[db-migration-strategy]]).
* Before phase 6 the API is plain HTTP. Never let a release mobile build point at an `http://` URL.

## When Changing Deployment Files Report

* Ports changed (and `ss -tlnp` result), env vars added or changed, image names/tags, volume impact, manual VPS commands, and resource-limit, log-rotation, or backup gaps touched or still open.
