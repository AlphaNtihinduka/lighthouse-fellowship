# Lighthouse Fellowship Agent Instructions

## Project

This repository holds the Lighthouse Fellowship sermon notes product for Lighthouse Fellowship Napoli (ICF Napoli):

* `backend/` — Spring Boot API
* `dashboard/` — React web dashboard where admins write sermon notes
* `mobile/` — Expo (React Native) app for iOS and Android where visitors read notes and play the fill-in-the-blank game

The product plan is `docs/PLAN.md`. Current status is `.claude/PROJECT_STATE.md`. Decisions are in `docs/decisions/`.

## Stack

* Java 25 / Spring Boot 4, Maven wrapper
* PostgreSQL 17, Spring Data JPA, Flyway
* JWT authentication, BCrypt password hashing
* Cloudinary for note cover images
* React + Vite + TypeScript (dashboard)
* Expo + TypeScript, expo-router, react-native-reanimated, react-native-gesture-handler, TanStack Query (mobile)
* Docker Compose on the shared SponsorDirect VPS, deployed by GitHub Actions over SSH

## Current Roles

Only these roles exist for now:

* ADMIN — signs in to the dashboard with email + password; writes, schedules and publishes notes; sees the consented visitor contact list
* VISITOR — optional; signs in from the mobile app with an emailed 6-digit code (no password) to sync game progress and personal notes

Anonymous use of the mobile app is the default and must always keep working without signing in.

Do not add SECRETARY, MEDIA or other admin sub-roles until explicitly requested.

## Hard Rules

* Use PostgreSQL 17 and Spring Data JPA (`JpaRepository`, `jakarta.persistence`). No MongoDB.
* Every schema change is a new Flyway migration. Never edit an applied migration. `ddl-auto=validate`.
* Follow the existing backend package structure under `com.lighthousefellowship.backend`: `config`, `controller`, `dto/request`, `dto/response`, `exception` (+ `GlobalExceptionHandler`), `mapper`, `model`, `model/enums`, `repository`, `service`, `service/impl`, `service/support`.
* Do not create a new architecture unless explicitly asked.
* Sermon note content is a list of blocks (`HEADING`, `SCRIPTURE`, `PARAGRAPH`, `LIST`, `REFLECTION`) stored as validated JSONB. A blank's answer is 1–3 words. See `docs/PLAN.md` §4 and ADR 0002.
* Public endpoints are only: published note reads, visitor code request/verify, admin login, health. Everything else requires a JWT with the right role.
* Unpublished notes (`publish_at` null or in the future) must never be returned by a public endpoint.
* Visitor emails are personal data (GDPR, Italy/EU): collect only email + consent, keep consent timestamp, support delete-my-data (requested in app, admin-approved, purged 30 days after approval: ADR 0004), never log full emails or login codes.
* Login codes are stored hashed, expire, are single-use and rate-limited.
* Do not expose passwords or password hashes in responses. Do not store plaintext passwords.
* Do not commit `.env`. Use `.env.example` with safe placeholders only.
* Docker database hostname is `postgres`, not localhost.
* Backend container port is 8081; VPS host port is 8099. Dashboard VPS host port is 8100. Other apps on the shared VPS hold 8001, 8002 and every port from 8080 to 8098 (checked with `ss -tlnp` on 2026-10-24; 8094/8095, the original plan, turned out to be taken). Check again before any port change.
* No domain yet: test builds use plain HTTP to the VPS IP. Release builds must use HTTPS.
* English only in the UI.

## Before Changing Code

Always inspect the existing entities, DTOs, repositories, services, controllers, config, exception handling, mobile screens/components and dashboard pages in the area you touch, and follow their style.

## After Changing Code

Report:

* files added
* files changed
* endpoints added or changed
* roles required
* environment variables changed
* manual commands needed
* risks or assumptions

Update `.claude/PROJECT_STATE.md` when a phase completes, something becomes blocked, or the current initiative changes.
