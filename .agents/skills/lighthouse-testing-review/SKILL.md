---
name: lighthouse-testing-review
description: Use when writing tests, reviewing generated code, auditing a Lighthouse Fellowship change (backend, dashboard or mobile), checking for regressions, or preparing manual device test instructions.
---

When asked to test or review work, check behavior against `docs/PLAN.md` and [[lighthouse-domain-rules]], not just against the code's own intent. Prefer static review and short test runs; do not run long Docker commands, `docker compose up`, or delete volumes unless asked.

## Backend (`backend/`)

Tools: JUnit 5, Mockito, Spring Boot Test, MockMvc, Testcontainers PostgreSQL 17 (never H2: JSONB and CHECK constraints must behave like production).

* **Unit tests** (Mockito) for every service impl and for `NoteContentValidator`, with a fixed `Clock`.
* **Integration tests** extend one `BaseIntegrationTest` that starts a shared Postgres container and runs the real Flyway migrations.
* **Role matrix** for every endpoint touched: anonymous / VISITOR / ADMIN, plus a wrong-audience or tampered token.

| Endpoint group | Anonymous | VISITOR | ADMIN |
|---|---|---|---|
| `GET /api/notes/**` | 200 (published only) | 200 | 200 |
| `/api/visitor-auth/*`, `/api/auth/login` | allowed | allowed | allowed |
| `/api/me/**` | 401 | 200 (own data only) | 401/403 |
| `/api/admin/**` | 401 | 403 | 200 |

  A visitor token on `/api/admin/**` is the most important negative case; also try a visitor token re-signed with `role=ADMIN`, and an admin token whose `token_version` is stale.
* **Unpublished-note leakage:** create a draft (`publish_at` null) and a scheduled note (`publish_at` in the future). Assert both are absent from `GET /api/notes?year=`, never returned by `GET /api/notes/latest`, and 404 on `GET /api/notes/{id}`. Then move the clock past `publish_at` and assert they appear. Also assert `/api/me` writes for an unpublished note are rejected.
* **Content validation:** reject unknown block type, missing required field, duplicate block ID, duplicate blank ID, segment with both text and blank, empty answer, 4-word answer, whitespace-only answer; accept 1-, 2- and 3-word answers and side-by-side blanks. Round-trip the three sample notes from PLAN §14 through save and read unchanged.
* **Sunday rule:** non-Sunday `sermonDate` → 400; second note for the same Sunday → 409.
* **Visitor auth:** code expires after 10 min, works once, dies after the attempt limit, new request invalidates the old code, unknown and known emails get identical responses, rate limit returns 429. Assert no log line contains the full email or the code.
* **Visitor data:** attempt upload with a repeated `client_attempt_id` creates no duplicate; one visitor cannot read or write another's personal notes; a deletion request hides the visitor from the contact list at once, approval sets `purge_after` 30 days out (test with an injected Clock), cancel restores everything, and the purge job removes visitor, attempts, notes and codes; the admin visitor list and CSV contain only consented visitors.
* **DTO safety:** no response contains `password_hash`, code hashes, `coverImagePublicId` on public reads, or personal notes on admin endpoints.

## Dashboard (`dashboard/`)

Tools: Vitest + React Testing Library (+ `msw` for API mocks).

* Make-blank: selecting 1–3 words creates a blank; selecting 0 or 4+ words is refused with a message; a blank turns back into text.
* Block reorder and delete keep block and blank IDs stable.
* Preacher field pre-filled with "Pastor Joe Benecasa" and editable.
* Publish now / schedule sends the right `publishAt`; the notes list shows Empty / Draft / Scheduled / Published correctly.
* 401 from the API logs the admin out and returns to login.
* Preview uses the shared pagination logic (same inputs give the same pages as mobile).

## Mobile (`mobile/`)

Tools: jest-expo. Keep pagination, word-bank and scoring logic as pure TypeScript functions so they are unit-testable without a device.

* Pagination: given measured block heights and a page height, blocks pack in order; a too-tall SCRIPTURE splits at sentence boundaries; header/footer space is reserved on every page; a different page height re-paginates.
* Word bank: each page's bank holds exactly that page's answers, shuffled (seeded random in tests), none from other pages; pages without blanks have no bank.
* Scoring: whole-note score only; duplicate answers ("wanted", "wanted") interchangeable; replay resets state.
* Offline queue: attempts made offline are queued and sent once when online; a failed upload stays queued.
* Anonymous mode: with no token, or with an expired token, the reader and game still work.

### Manual device checklist

Run before calling phase 3 or 4 done, and after any change to the reader, page turn or game.

1. Low-end Android phone (release-like APK, not dev mode): page turn holds 60 fps with no visible drops; fallback transition kicks in if not.
2. iPhone via Expo Go: layout, fonts, page turn, drag-and-drop.
3. Tablet: about 2 pages per note, larger trays, nothing stretched.
4. Airplane mode: a previously opened note and the archive list open; a new note shows a clear offline message; play a full note and confirm the attempt uploads after reconnecting.
5. Drag-and-drop: chip snaps in, drag back out removes; tap chip then tap blank also works; system font size at maximum still usable.
6. Rotation: pages recalculate, current position kept close, placed chips stay in their blanks.
7. Layout matches the paper: header picture, "Sermon Notes", title, numbered headings, italic scripture with right-aligned reference, footer with preacher, church, date.

## Review Checklist

1. Does the change follow the agreed structure ([[lighthouse-feature-builder]], [[mobile-app-builder]], [[dashboard-builder]])?
2. Does every new endpoint have an explicit SecurityConfig matcher, and is there a role-matrix test including visitor-on-admin?
3. Can a draft or scheduled note leak through any public path, list, latest, cache header or error message?
4. Is content validated server-side on every write, with tests for the 1–3 word rule?
5. Are `/api/me` queries scoped by the principal, with a cross-visitor negative test?
6. Are codes hashed, expiring, single-use, attempt-limited and rate-limited; are emails masked in logs ([[data-privacy-and-audit]])?
7. Is there a new Flyway migration for every schema change, with no edited migration?
8. Was anything from "Do Not Implement Yet" added without a request?
9. Does anonymous mode still work end to end?
10. Were `docs/API.md`, `.env.example` and Compose updated where needed?
11. Do mobile gestures stay on the UI thread, and was the device checklist run for reader changes?
12. What should the user test manually next?

Hand bigger test-strategy questions to [[role-qa-test-engineer]] and security questions to [[role-security-compliance]].
