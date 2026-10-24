---
name: secrets-and-config-management
description: Use when touching .env, .env.example, application.properties/yml, Docker Compose environment blocks, GitHub Actions secrets, or Expo app config (app.json/app.config, eas.json, EXPO_PUBLIC_* variables). Prevents secret leakage across the backend, dashboard, and mobile app.
---

## Where secrets live

* **Backend `.env` on the VPS** (next to `docker-compose.yml`, never committed): `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION_MS`, `CLOUDINARY_URL`, the admin seed email and password (`ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` or whatever names phase 1 settles on), and later `RESEND_API_KEY` plus the sender address (phase 5/6).
* **GitHub Actions secrets:** `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `DOCKER_USERNAME`, `DOCKER_PASSWORD`.
* **Mobile app:** no secrets at all. See below.
* **Dashboard:** no secrets. Anything in a Vite `VITE_*` variable ends up in the public JS bundle; only the API base URL belongs there.

One environment and one developer; a single `.env` plus GitHub secrets is the right stage. If a staging environment or a second server is ever added, use per-environment GitHub Actions Environments or a secrets manager instead of hand-copied `.env` files. Raise it then; don't build it before.

## The mobile app cannot keep a secret

Anything in the Expo app (JS bundle, `app.json`/`app.config`, `EXPO_PUBLIC_*` variables, `eas.json`) can be extracted from the installed app. So:

* The only configuration the app gets is the public API base URL, `EXPO_PUBLIC_API_URL`.
* No Cloudinary key, Resend key, JWT secret, admin credential, or any other key in mobile code or config. If a feature seems to need one, it goes through the backend.
* Image uploads happen from the dashboard through the backend; the app only reads Cloudinary URLs.
* The visitor token is stored with `expo-secure-store`, never `AsyncStorage` or a plain file.
* Test builds may use `http://<VPS_IP>:8094`; release builds must use the HTTPS domain (phase 6). Keep the URL per EAS build profile, not hardcoded.

## Rules

* `.env` is never committed; `.env.example` holds placeholders only. Verify this before any commit touching these files.
* Never print a secret value in logs, CI output, PR comments, or chat. Refer to the variable name.
* No secret has a working default in `application.properties`. Use `${JWT_SECRET}` with no fallback so a missing value fails startup. A hardcoded fallback hides a misconfigured deploy and runs production on a known secret.
* `JWT_SECRET` is long and random; the placeholder is obviously fake, e.g. `replace_with_secure_jwt_secret`.
* The admin seeder creates the first admin from env vars only if no admin exists, stores a BCrypt hash, and never logs the password. Rotate the seed password after first login.
* New secret: add it to `.env.example` as a placeholder, to the Compose `environment:` block, and to the env var list in the deployment docs. Remember the VPS compose file must be synced ([[docker-vps-deployment]]).
* `DOCKER_PASSWORD` is a scoped Docker Hub access token, not the account password.
* No rotation is enforced. When rotation comes up, suggest: immediately on a suspected leak, otherwise every 3-6 months, and note the date somewhere durable.
* Rotating `JWT_SECRET` signs out every admin and visitor. Visitors would have to request a new email code. Flag this every time.
* The production `.env` exists only on the VPS disk. Keep an encrypted copy off the VPS (password manager), so a lost VPS is not also lost secrets.

## Checklist

1. Does this change add a secret? Is it a placeholder in `.env.example`, passed through Compose, and documented?
2. Does any diff, log line, doc, or mobile/dashboard file contain a real secret value?
3. Does the mobile or dashboard change put anything besides the public API URL in client config?
4. Report the secrets added or changed and what the user must set in the VPS `.env`, GitHub secrets, or EAS profiles.
