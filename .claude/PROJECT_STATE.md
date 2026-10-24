# Project State

This file is the single source of truth for "what's currently in flight." It is
**current-state-only**: overwrite sections as work moves forward, don't append a
running log (that's what `git log` is for). It is committed so it survives editor
switches, machine switches and fresh sessions.

If you're a session picking up this project cold, read this file and `docs/PLAN.md`
before asking the user to re-explain context. If something here conflicts with what
you observe directly (git log, running containers, deployed schema), trust what you
observe and correct this file.

## Phase 0, Foundation: complete (commit `ce04d09`)

Three empty projects building in CI, 22 skills, AGENTS.md, ADRs 0001–0004.

## Phase 1, Backend core: complete (deployed 2026-10-25, image `dd82506`)

Live at `http://187.127.77.125:8099` (health UP, admin login verified). Deploys run automatically after green CI on `main` (`DEPLOY_ENABLED=true`, GitHub Actions deploy key in `VPS_SSH_KEY`, authorized for root on the VPS). Contract: `docs/API.md`; setup and rollback: `docs/runbooks/vps-first-deploy.md`.

* Flyway V1: `admin_user`, `sermon_note` (visitor tables come in phase 5).
* Admin auth (own JWT key/audience, `token_version`), seeder; note CRUD, validated JSONB content, publish/schedule/unpublish, Cloudinary cover upload; public reads filter `publish_at <= now`; login rate limit; request ids.
* VPS `.env` at `/opt/lighthouse-fellowship/.env` (root-only), secrets generated on the server. Admin: `ntihindukaalpha@yahoo.com`, password = `ADMIN_SEED_PASSWORD` there.
* **Covers are off**: `CLOUDINARY_URL` is a placeholder, so cover upload returns 502 until a real URL is set and the backend restarted.

Follow-ups for the user: change the seed admin password; save the VPS `.env` in a password manager; rotate the Docker Hub token (it was pasted in chat) and update `DOCKER_PASSWORD`.

## Current: phase 2, Dashboard (increment 1 of 2 done locally)

Increment 1 (this PR): login (session in `sessionStorage`, any 401 signs out, safe `?next=` redirect), notes calendar (every Sunday of a month: Empty / Draft / Scheduled with Rome time / Published), Account page with password change, app shell, 19 Vitest + RTL tests, Docker image (unprivileged nginx, host port 8100), deployed alongside the backend by `deploy.yml` (repo variable `DASHBOARD_API_URL`). Backend: wrong current password on password change is now 400, not 401.

Increment 2 (next): block editor with make-blank (1–3 words, stable ids), cover upload, phone-sized preview with the shared pagination function, publish now / schedule / unpublish, unsaved-changes warning; then enter the three sample notes. Set up the Postgres backup before real notes go in.

## Known gaps (not blocking)

* No off-VPS Postgres backup yet (see runbook).
* Rate-limit buckets are never pruned (memory grows with distinct emails until restart).
* Sample-note fixtures use placeholder answers "spend" and "witness" for the two unknown blanks in "Jesus is in the Boat!", and "overcame these attacks" as one 3-word answer.

## Open items waiting on the user

* High-resolution logo (≥ 1024×1024, ideally SVG). Current file `docs/brand/logo-original.png` is 139×93. Needed by phase 3.
* Missing sample answers (PLAN §14). Placeholders are fine.
* Is "ICF Napoli" the church's official name, and should the app show it?

## Key facts

* GitHub: `AlphaNtihinduka/lighthouse-fellowship`. Local folder: `light-house-fellowship`.
* Java 25 target (same as SponsorDirect). **Machine-local:** the user's default `java` is 21 and there is no JDK 25; the build works with IntelliJ's JDK 26 (`JAVA_HOME=~/.jdks/openjdk-26.0.1 ./mvnw verify`), which compiles for 25. Installing Temurin 25 removes the need for this. Integration tests need Docker Desktop running.
* Spring Boot 4 notes: Jackson 3 (`tools.jackson.*`; annotations are still `com.fasterxml.jackson.annotation`), Flyway via `spring-boot-starter-flyway`, Testcontainers 2 (`org.testcontainers.postgresql.PostgreSQLContainer`).
* Delete my data: request in app → admin approves → purge 30 days after approval (ADR 0004).
* VPS is shared with SponsorDirect and other apps. Taken ports (checked 2026-10-24): 8001, 8002 and every port from 8080 to 8098. 8094 is `attendance-domain`, 8095 an MT5 orchestrator on localhost. Ours: 8099 (API), 8100 (dashboard). Deploy dir `/opt/lighthouse-fellowship`.
* No domain yet: test builds use HTTP to the VPS IP. Google Play account exists; Apple Developer account not yet. iPhone testing is via Expo Go only until then.
