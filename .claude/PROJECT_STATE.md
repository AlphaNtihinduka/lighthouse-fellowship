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

## Current: phase 1, Backend core: code done, not yet committed or deployed

Done and verified locally (`./mvnw verify`: 109 tests green against Testcontainers PostgreSQL 17; the Docker image built and the Compose stack ran healthy end to end):
* Flyway `V1__baseline.sql`: `admin_user`, `sermon_note` only. The visitor tables from PLAN §5 come in phase 5 with their code.
* Admin auth: `POST /api/auth/login`, `GET /api/admin/account`, `PATCH /api/admin/account/password` (bumps `token_version`). JWT with its own admin key + audience; the filter checks `tv` against the DB and takes the role from the row. Seeder from `ADMIN_SEED_*`.
* Notes: admin CRUD, publish (now or scheduled) / unpublish, Cloudinary cover upload (magic-byte check, old cover deleted, 10 MB → 413). `NoteContentValidator` enforces ADR 0002; unknown JSON fields are rejected globally (`spring.jackson.deserialization.fail-on-unknown-properties=true`).
* Public: `GET /api/notes?year=`, `/latest`, `/{id}`, all filtering `publish_at <= now` in the query; ETag + `Cache-Control: no-cache`.
* Rate limit on login (per IP + per email) and password change; request-id filter with MDC; security chain ends in `denyAll()`.
* `docker-compose.yml` (root), `backend/Dockerfile`, `.env.example`, `deploy.yml` (runs after CI passes on main, only when repo variable `DEPLOY_ENABLED=true`), action versions bumped in `ci.yml`.
* `docs/API.md` (the contract for phase 2/3), `docs/runbooks/vps-first-deploy.md`.

Blocked on the user to finish phase 1 ("API runs on the VPS"): follow `docs/runbooks/vps-first-deploy.md` (check ports/memory, create `/opt/lighthouse-fellowship/.env`, Docker Hub repo + token, GitHub secrets, `DEPLOY_ENABLED=true`).

## Next: phase 2, Dashboard

Login, notes calendar, block editor with blanks, cover upload, preview, scheduling, Account page; enter the three sample notes. Deploy the dashboard on host port 8095 and add its origin to `CORS_ALLOWED_ORIGINS`. Set up the Postgres backup before real notes go in.

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
* VPS is shared with SponsorDirect and other apps. Taken ports: 8084, 8085, 8087, 8088, 8089. Ours: 8094 (API), 8095 (dashboard). Deploy dir `/opt/lighthouse-fellowship`.
* No domain yet: test builds use HTTP to the VPS IP. Google Play account exists; Apple Developer account not yet. iPhone testing is via Expo Go only until then.
