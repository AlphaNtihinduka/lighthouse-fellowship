# Project State

This file is the single source of truth for "what's currently in flight." It is
**current-state-only**: overwrite sections as work moves forward, don't append a
running log (that's what `git log` is for). It is committed so it survives editor
switches, machine switches and fresh sessions.

If you're a session picking up this project cold, read this file and `docs/PLAN.md`
before asking the user to re-explain context. If something here conflicts with what
you observe directly (git log, running containers, deployed schema), trust what you
observe and correct this file.

## Current phase: 0, Foundation (done locally, not yet committed or run in CI)

Done:
* `backend/`: Spring Boot 4.0.5, Java 25, package `com.lighthousefellowship.backend`. Only web, actuator, validation, Lombok, MapStruct for now; JPA/Flyway/Postgres/Security/jjwt arrive in phase 1 with the code that uses them. `./mvnw verify` passes locally (health smoke test).
* `dashboard/`: React 19 + Vite 8 + TypeScript placeholder page with brand colours. `npm run lint` and `npm run build` pass.
* `mobile/`: Expo SDK 58 blank TypeScript app, name "Lighthouse Fellowship", bundle/package `com.lighthousefellowship.app`, placeholder screen. `npm run typecheck` passes. expo-router, Reanimated and Gesture Handler are not installed yet (phase 3). Routes will go in `mobile/src/app/`.
* 22 skills in `.claude/skills/` (mirrored to `.agents/skills/`), `AGENTS.md`, ADRs 0001–0004, `.github/workflows/ci.yml`.

Phase 0 is complete once CI passes on GitHub.

## Next: phase 1, Backend core

Admin auth + seeder, note CRUD with content validation, publish/unpublish, public read API, Cloudinary cover upload, tests, Docker + `deploy.yml` to the VPS. See `docs/PLAN.md` §5, §6, §9.

Before the first deploy: check ports 8094/8095 are free and memory headroom on the VPS (`ss -tlnp`, `free -h`, `docker stats`), and add GitHub secrets (SSH key, host, Docker Hub).

## Open items waiting on the user

* High-resolution logo (≥ 1024×1024, ideally SVG). Current file `docs/brand/logo-original.png` is 139×93. Needed by phase 3.
* Missing sample answers (PLAN §14). Placeholders are fine.
* Is "ICF Napoli" the church's official name, and should the app show it?

## Key facts

* GitHub: `AlphaNtihinduka/lighthouse-fellowship`. The local folder may still be named `light-house-church` until the user renames it.
* Java 25 target (same as SponsorDirect). **Machine-local:** the user's default `java` is 21 and there is no JDK 25; the build works with IntelliJ's JDK 26 (`JAVA_HOME=~/.jdks/openjdk-26.0.1 ./mvnw verify`), which compiles for 25. Installing Temurin 25 removes the need for this.
* Delete my data: request in app → admin approves → purge 30 days after approval (ADR 0004).
* VPS is shared with SponsorDirect and other apps. Taken ports: 8084, 8085, 8087, 8088, 8089.
* No domain yet: test builds use HTTP to the VPS IP. Google Play account exists; Apple Developer account not yet. iPhone testing is via Expo Go only until then.
