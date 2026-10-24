# First backend deploy to the VPS

One-time setup. After this, every push to `main` that passes CI deploys automatically (`.github/workflows/deploy.yml`).

## 1. Check the VPS has room (it is shared with SponsorDirect)

```sh
ss -tlnp | grep -E ':(8099|8100)\b'   # must print nothing
free -h                              # need ~1.3 GB free: backend limit 768M + Postgres 512M
docker stats --no-stream
```

If 8099 or 8100 is taken, stop and pick other ports. Don't guess: an undocumented app once held 8088.

## 2. Create the deploy directory and `.env`

```sh
sudo mkdir -p /opt/lighthouse-fellowship
sudo chown "$USER" /opt/lighthouse-fellowship
cd /opt/lighthouse-fellowship
nano .env        # paste .env.example from the repo and fill in real values
chmod 600 .env
```

* `POSTGRES_PASSWORD`, `JWT_ADMIN_SECRET`: `openssl rand -base64 48` each.
* `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`: the pastor's (or your) login; at least 12 characters.
* `CLOUDINARY_URL`: from the Cloudinary console (*API environment variable*).
* `CORS_ALLOWED_ORIGINS=http://<VPS_IP>:8100` once the dashboard is deployed (phase 2); for now `http://localhost:5173` lets a local dashboard talk to the VPS API.

Save a copy of this `.env` in a password manager. The VPS copy is the only other one.

## 3. Docker Hub

Create the repository `<DOCKER_USERNAME>/lighthouse-fellowship-backend`. If it is private, run
`docker login` once on the VPS so `docker compose pull` can read it.

Create an access token (Account settings → Personal access tokens, read/write) for GitHub Actions.

## 4. GitHub (Settings → Secrets and variables → Actions)

Secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD` (the access token), `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
(same values SponsorDirect uses are fine if that user can run `docker`).

Variable: `DEPLOY_ENABLED` = `true`. Until it is set, the Deploy workflow is skipped and CI stays green.

## 5. Firewall

If `ufw` is active: `sudo ufw allow 8099/tcp` (and `8100/tcp` in phase 2). Postgres is never published.

## 6. Deploy and check

Actions → **Deploy** → *Run workflow* (or push to `main`). The job waits for the backend healthcheck.

```sh
curl http://<VPS_IP>:8099/actuator/health          # {"status":"UP",...}
curl -X POST http://<VPS_IP>:8099/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<ADMIN_SEED_EMAIL>","password":"<ADMIN_SEED_PASSWORD>"}'
```

Then change the seed password (`PATCH /api/admin/account/password`, see `docs/API.md`).

## Rollback

Every image is also tagged with its commit SHA:

```sh
cd /opt/lighthouse-fellowship
BACKEND_IMAGE=<DOCKER_USERNAME>/lighthouse-fellowship-backend:<older-sha> docker compose up -d
```

A rollback does not undo Flyway migrations. If the bad release added one, the old image must still work
with the new schema (it will, as long as migrations stay additive).

## Never

* `docker compose down -v`: deletes the Postgres volume, the only copy of the notes.
* Editing `docker-compose.yml` on the VPS: the next deploy overwrites it. Change it in the repo.

## Still open

Backups: nothing dumps the Postgres volume off the VPS yet. Add a scheduled `pg_dump` and a tested restore
before real notes go in (phase 2).
