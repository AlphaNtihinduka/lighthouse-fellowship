# Lighthouse Fellowship — Plan

Status: draft for review (2026-10-24). Nothing is built yet.
Repo: `AlphaNtihinduka/lighthouse-fellowship`. App name: **Lighthouse Fellowship**.

## 1. What we are building

Lighthouse Fellowship Napoli hands out paper sermon notes every Sunday. The pastor preaches from them and reveals the words that go in the blanks; the congregation writes them in. Many visitors (tourists, one-time guests) never come back, and the church loses touch with them.

The product makes those notes available on a phone, in the same layout as the paper, with the blanks turned into a drag-and-drop word game.

| Part | Who uses it | Login |
|---|---|---|
| Mobile app (iOS + Android) | Visitors and members | None. Optional email code to sync progress |
| Web dashboard | Pastor / church admins | Email + password (ADMIN role) |
| Backend API | Both of the above | JWT |

## 2. Confirmed requirements

- English only.
- Notes are Sunday-only. One note = one paper sheet (front and back); "(con't)" is just the second page, not a series.
- Browse by year → month → Sunday.
- Reader keeps the paper format: header picture, "Sermon Notes", title, numbered section headings, italic scripture quotes with right-aligned reference, plain or centred lines, footer (preacher, "Lighthouse Fellowship Napoli", date).
- Content is paged automatically to fit the screen (about 3–4 pages on a phone, about 2 on a tablet) and turned with an animated, book-like swipe to the left.
- Blanks: each blank's answer is 1–3 words. Blanks can appear anywhere: in section headings, numbered points, centred lines and normal text. Two blanks can sit side by side ("David and Jesus were both ______ ______." → "unexpected", "kings").
- Each page has its own word bank, holding only the correct answers for the blanks on that page, shuffled. The score is shown once, after the whole note is completed ("8 / 10"). Replay is allowed.
- Preacher: Pastor Joe Benecasa by default; guest speakers (e.g. Rev. Bill Steinmetz) can be entered per note.
- Notes stay readable offline once opened.
- The pastor chooses the publish date and time for each note; it is hidden from the app before then.
- Visitors are anonymous by default. "Save my progress" signs them in with an emailed 6-digit code (no password) and syncs scores across devices. The church gets a contact list of those who consent.
- Only the ADMIN role for now. Secretary or media-team roles come later.
- Backend: Spring Boot on the same VPS as SponsorDirect. Web dashboard: React.
- No domain yet. Testing is done by installing the app directly on phones; the domain, HTTPS and store listings come at the release stage.

## 3. Architecture

```
lighthouse-fellowship/         (one repo)
├── backend/      Spring Boot 4, Java 25, Postgres 17, Flyway, JWT
├── dashboard/    React + Vite + TypeScript (admin web app)
├── mobile/       Expo (React Native) + TypeScript
├── docs/         PLAN.md, decisions/ (ADRs), runbooks/
├── .claude/      skills/ (adapted from SponsorDirect), PROJECT_STATE.md
├── AGENTS.md
└── docker-compose.yml
```

- **One repo**, because the three parts share one content format and change together. → ADR 0001.
- **Backend** follows SponsorDirect's layout exactly: `config`, `controller`, `dto/request`, `dto/response`, `exception` (+ `GlobalExceptionHandler`), `mapper` (MapStruct), `model`, `model/enums`, `repository`, `service`, `service/impl`, `service/support`. Lombok, `jakarta.persistence`, JpaRepository, Flyway `V1__baseline.sql`, Testcontainers, admin seeder, rate-limit filter, Cloudinary for images.
- **Mobile:** Expo SDK (latest stable), expo-router, react-native-reanimated + react-native-gesture-handler (page turn, drag-and-drop), TanStack Query with a persisted cache (offline), expo-secure-store (visitor token), EAS Build (iOS builds without a Mac).
- **Dashboard:** React + Vite + TypeScript, React Router, TanStack Query.
- **Deployment:** its own `docker-compose.yml` on the SponsorDirect VPS with its own Postgres container and backend container; the dashboard is a static build served by a small nginx container. Plain HTTP on the VPS IP during testing; a domain and HTTPS at release.
- **Ports.** Already taken on the VPS, according to the SponsorDirect docs: 8084 (SponsorDirect API), 8085 (SponsorDirect dashboard), 8087, 8088 (`wakeyme-portfolio`), 8089 (SponsorDirect website). **8099 → backend**, **8100 → dashboard** (2026-10-24: the first proposal, 8094/8095, was already taken by undocumented apps; the VPS actually uses 8001, 8002 and every port from 8080 to 8098). Postgres is not published to the host. Confirm with `ss -tlnp` on the VPS before the first deploy; 8088 once collided silently with an app nobody had documented.

## 4. Content model (the core decision)

A note is an ordered list of **blocks**. The pastor writes blocks; the app decides page breaks.

```json
{
  "title": "Killing Giants",
  "sermonDate": "2026-09-13",
  "preacherName": "Pastor Joe Benecasa",
  "coverImageUrl": "https://res.cloudinary.com/.../giants.jpg",
  "publishAt": "2026-09-13T09:00:00+02:00",
  "blocks": [
    { "id": "b1", "type": "SCRIPTURE",
      "text": "...David took his staff in his hand, chose five smooth stones...",
      "reference": "1 Samuel 17:40-47" },
    { "id": "b2", "type": "PARAGRAPH", "align": "CENTER",
      "segments": [
        { "text": "The question before us this morning is not " },
        { "blankId": "k1", "answer": "if" },
        { "text": " we are going to " },
        { "blankId": "k2", "answer": "face" },
        { "text": " giants, but " },
        { "blankId": "k3", "answer": "how" },
        { "text": " we are going to " },
        { "blankId": "k4", "answer": "defeat them" },
        { "text": "." }
      ] },
    { "id": "b3", "type": "HEADING", "text": "God will prepare us to fight the enemy." }
  ]
}
```

Block types, based on the four sample notes:

| Type | Paper example | Fields |
|---|---|---|
| `HEADING` | "I. David and Jesus remained under God's ___." / "Let's be clear!" | segments (can contain blanks), `numbered` (true → auto I, II, III; false for a plain label) |
| `SCRIPTURE` | *"Man looks at the outward appearance…"* – 1st Samuel 16:8 | text, reference (free text, e.g. "1 Samuel 24:4A 6:12") |
| `PARAGRAPH` | "God is trying to ___ to us who His Son is." | segments, align (LEFT / CENTER) |
| `LIST` | "1. Jesus is ___." "2. If you have Jesus in your heart…" | items, each a list of segments; numbered 1, 2, 3 with a hanging indent |
| `REFLECTION` | "What is God showing me as His 'safe' adventure for Him?" + "Notes:" lines | prompt; the visitor types personal notes (see below) |

- A segment is either `{ "text": "..." }` or `{ "blankId": "...", "answer": "1–3 words" }`, so blanks work the same way in every block type.
- Blocks are stored as one validated JSONB column on the note, not as separate tables: a note is always read and saved whole, and the format can grow (bold text, images, new block types) without migrations. The backend validates structure, block and blank IDs, and answer length (1–3 words). → ADR 0002.
- **Answers are sent to the app.** The word bank shows the correct answers anyway, so hiding them protects nothing, and sending them lets the game score offline. → ADR 0003.

## 5. Database (Flyway V1)

| Table | Key columns |
|---|---|
| `admin_user` | id, email (unique), password_hash (BCrypt), display_name, role, token_version, created_at |
| `sermon_note` | id (UUID), title, preacher_name, sermon_date (unique, Sunday), cover_image_url, cover_image_public_id, content (JSONB), content_version, publish_at (null = draft), created_by, created_at, updated_at |
| `visitor` | id (UUID), email (unique), contact_consent, consent_at, created_at, last_seen_at |
| `email_login_code` | id, email, code_hash, expires_at (10 min), attempts, consumed_at |
| `quiz_attempt` | id, visitor_id, note_id, client_attempt_id (unique per visitor, for repeat-safe sync), score, total, completed_at |
| `visitor_note_text` | visitor_id, note_id, block_id (null = the general "My notes" pad), text, updated_at (private to the visitor) |
| `visitor_deletion_request` | id, visitor_id (nulled after purge), status (PENDING / APPROVED / CANCELLED / COMPLETED), requested_at, approved_at, approved_by, purge_after (approved_at + 30 days), completed_at. See ADR 0004 |

## 6. API

**Public (no token)**
- `GET /api/notes?year=2026`: published note summaries (id, title, sermonDate, coverImageUrl, contentVersion), used to build the year/month/Sunday browser.
- `GET /api/notes/latest`: this Sunday's note.
- `GET /api/notes/{id}`: full published note with blocks.
- `POST /api/visitor-auth/request-code` `{email, contactConsent}`: sends the 6-digit code; rate-limited per email and IP.
- `POST /api/visitor-auth/verify` `{email, code}`: returns a visitor token.
- `POST /api/auth/login`: admin login.
- `GET /actuator/health`

**Visitor (VISITOR token)**
- `GET /api/me/attempts`: progress across devices.
- `POST /api/me/attempts`: batch upload of attempts made on the device; safe to repeat.
- `GET /api/me/notes/{noteId}/texts`, `PUT /api/me/notes/{noteId}/texts/{blockId}`: personal reflection notes.
- `PATCH /api/me/consent`: change contact consent.
- `POST /api/me/deletion-request`: ask for all my data to be deleted (GDPR; Apple requires deletion to start in the app). The visitor leaves the contact list immediately.
- `GET /api/me/deletion-request`, `DELETE /api/me/deletion-request`: see status / cancel, any time before the purge.

**Admin (ADMIN token)**
- `GET /api/admin/notes?year=&month=`, `GET /api/admin/notes/{id}` (drafts included)
- `POST /api/admin/notes`, `PUT /api/admin/notes/{id}`, `DELETE /api/admin/notes/{id}`
- `POST /api/admin/notes/{id}/cover-image` (multipart → Cloudinary)
- `PATCH /api/admin/notes/{id}/publish` `{publishAt}` / `.../unpublish`
- `GET /api/admin/visitors` (consented contacts) + `GET /api/admin/visitors/export.csv`
- `GET /api/admin/deletion-requests?status=`, `PATCH /api/admin/deletion-requests/{id}/approve` (sets purge date to 30 days later)
- A daily scheduled job permanently deletes approved requests whose purge date has passed (visitor, attempts, personal notes, login codes).

## 7. Mobile app

**Screens**
1. **Home**: this Sunday's note as a large card, plus "Continue" for the last note opened.
2. **Archive**: year selector → month list → the Sundays in that month (date, title, thumbnail, best score if played).
3. **Reader**: the note as a book. Modes: *Read* (blanks shown as lines) and *Play* (word bank at the bottom).
4. **Results**: score, which blanks were wrong, "Try again", "Show answers".
5. **Save my progress**: email → code entry → consent checkbox.
6. **About / Settings**: church info, signed-in email, privacy policy, and "Delete my data" ("Your data will be deleted 30 days after the church confirms your request. You can cancel until then.").

**Pagination.** The app measures each block at the current screen size and packs blocks into pages. A block taller than a page (such as the long 1 Samuel 17:40-47 quote) is split at sentence boundaries. Page header (thumbnail, "Sermon Notes", title, "(con't)") and footer (preacher, church, date, "(over)") repeat on every page, as on the paper. Pages are recalculated on rotation and on tablets.

**Page turn.** A Reanimated + Gesture Handler page turn that follows the finger: 3D rotation around the left edge with perspective, a moving shadow and paper shading. It snaps forward or back depending on how far and how fast the page was dragged. Must hold 60 fps on a low-end Android phone; that is tested early (phase 3).

**Word game**
- Each page has its own tray at the bottom with chips (1–3 words each) for that page's blanks only, shuffled. Pages are computed per screen size, so a phone shows smaller trays than a tablet. Pages without blanks have no tray.
- Drag a chip onto a blank and it snaps in; drag it back out to remove. Tapping a chip and then a blank also works, for accessibility and for small screens.
- Blank width does not depend on answer length, so it gives no hint.
- A progress indicator ("6 of 10 blanks filled") tracks the whole note. On the last page, "Finish" scores the whole note: the visitor flips back through the pages with correct blanks in green and wrong ones in red, then sees one score screen, with a small celebration when the score is high.
- **Personal notes:** people write their own notes on the paper during the service ("Lord use my life", "Acts 2:42 — God is waiting for us to wait on Him"). The app has a **My notes** pad on every sermon note, opened from a button on any page, plus a text box inside each REFLECTION block. Saved on the phone, synced when signed in.
- Progress is saved on the phone first (works offline) and uploaded when the visitor is signed in.

**Offline.** Every note opened is cached on the device (data plus cover image). The archive list is cached too. Game attempts made offline are queued and uploaded later.

## 8. Dashboard

1. **Login**
2. **Notes**: calendar or list by month showing each Sunday's status: *Empty*, *Draft*, *Scheduled (date and time)*, *Published*.
3. **Note editor**
   - Fields: title, Sunday date, preacher (pre-filled with "Pastor Joe Benecasa", editable for guest speakers), cover image upload.
   - Block list: add Heading, Scripture, Paragraph, Numbered list or Reflection; drag to reorder; delete.
   - Paragraph editor: select words → "Make blank" (1–3 words, enforced). Blanks are shown as highlighted chips and can be turned back into text.
   - Live preview in a phone-sized frame next to the editor, with the same layout and pagination as the app.
   - Publish: now, or at a chosen date and time.
4. **Visitors**: consented contacts list, with CSV export. **Deletion requests** tab: pending requests with their age in days (highlighted after 7 days), an Approve button, and approved ones with their purge date.
5. **Account**: change password. Managing other admins comes later.

## 9. Phases

| # | Phase | Done when |
|---|---|---|
| 0 | **Foundation**: repo layout, AGENTS.md, adapted skills, PROJECT_STATE.md, ADRs 0001–0003, CI that builds the three parts | Empty projects build in CI |
| 1 | **Backend core**: admin auth + seeder, note CRUD, content validation, publish/unpublish, public read API, Cloudinary, tests, Docker deploy to VPS | API runs on the VPS; tests green |
| 2 | **Dashboard**: login, notes calendar, block editor with blanks, cover upload, preview, scheduling | The three sample notes ("Killing Giants", "Seeing Jesus in David", "Jesus is in the Boat!") are entered |
| 3 | **Mobile reader**: home, archive, faithful layout, pagination, page-turn animation, offline cache | Android APK on test phones; iPhone through Expo Go |
| 4 | **Word game**: chips, drag-and-drop + tap, scoring, results, replay, progress on the phone | A note can be played end to end offline |
| 5 | **Visitor sync**: email code sign-in, consent, attempt sync, delete account, dashboard Visitors page | Progress follows the visitor to a second phone* |
| 6 | **Release**: domain, HTTPS (Nginx + Let's Encrypt), email sending domain, privacy policy, icon and splash, Play Store internal → production, App Store once the Apple account exists | App live in the stores |

\* Email codes only reach the developer's own address until a sending domain is verified (phase 6). The flow is built and tested in phase 5 and goes live for everyone at phase 6.

**Later:** extra admin roles (secretary, media), push notification when a new note is published, statistics ("most missed blank"), sharing a note as a link.

## 10. Skills to adapt from SponsorDirect

Keep, rewritten for this project: `team-workflow`, `session-continuity`, the role skills (`role-product-manager`, `role-backend-platform-engineer`, `role-security-compliance`, `role-qa-test-engineer`, `role-devops-sre`, `role-dba-consultant`), `postgres-jpa-migration-guard`, `db-migration-strategy`, `api-contract-and-postman-docs`, `docker-vps-deployment`, `secrets-and-config-management`, `rate-limiting-and-abuse-guard`, `data-privacy-and-audit` (GDPR, visitor emails), `observability-and-logging`.

Replace the SponsorDirect domain skills with new ones: `lighthouse-domain-rules`, `lighthouse-auth-guardrails`, `lighthouse-feature-builder`, `lighthouse-testing-review`, plus `mobile-app-builder` (Expo conventions, animation performance, offline) and `dashboard-builder`.

Drop: `background-task-notifications`, `api-versioning-and-compat` (one API version; add it back when the app is in the stores), `ci-cd-staging-gate` (merged into `docker-vps-deployment` until there is a staging environment).

## 11. Brand

Logo: `docs/brand/logo-original.png`, a red and white striped lighthouse with yellow light beams, "ICF NAPOLI", "LIGHTHOUSE" in navy small caps, "Fellowship" in navy script.

| Token | Use | Starting value (to be matched against the original artwork) |
|---|---|---|
| Navy | Text, headings, header bar, dashboard sidebar | `#1F2A4A` |
| Lighthouse red | Primary buttons, active states, score highlight | `#C62828` |
| Beam yellow | Word-bank chips, celebration, "new note" badge | `#F4C542` |
| Paper | Page background in the reader | `#FBF8F1` (warm off-white, like the printed sheet) |

Typography follows the printed notes: a serif for titles and headings, a readable sans serif for body text, italics for scripture.

Deploys: automatic from GitHub Actions to the VPS over SSH (build → push image → SSH deploy), the same pattern as SponsorDirect. Decided 2026-10-24.

## 12. Risks

- **Pagination accuracy.** Measuring text height before showing it is the hardest part of the reader. Prototype it first in phase 3, on a small Android phone and an iPad.
- **Page-turn performance** on older Android phones. Fallback: a simpler slide-and-shadow transition chosen automatically.
- **iPhone testing** is limited to Expo Go connected to the developer's computer until the Apple Developer account exists (that account unlocks TestFlight).
- **No HTTPS during testing.** Test builds allow plain HTTP to the VPS IP; release builds will not.
- **GDPR.** Visitor emails are personal data: consent checkbox, privacy policy, delete-my-data (admin-approved, purged 30 days after approval: ADR 0004), and no other personal data collected. GDPR expects erasure within about a month of the request, so admins must approve promptly.
- **VPS resources.** A second Postgres and Java process on the SponsorDirect VPS. Check memory and free ports before phase 1.

## 13. Open questions

1. A high-resolution logo (at least 1024×1024, ideally SVG). The current file is 139×93, enough for the dashboard header but too small for the app icon and splash screen.
2. Answers still missing for test data (all optional; placeholders work):
   - "Killing Giants" (Sept 13): the sheets were photographed unfilled, so no answers.
   - "Jesus is in the Boat!": "Decide how you are going to ___ your nickel" and "Be an active ___ for Christ".
   - "Seeing Jesus in David": is "these attacks" (written under the line) part of the answer, i.e. "overcame these attacks" (3 words)?

## 14. Sample data (from the handwritten sheets)

| Note | Blanks → answers |
|---|---|
| Seeing Jesus in David (Sept 20, Pastor Joe Benecasa) | modeled a ___ ___ or ___ of Jesus → specific, behavior, characteristic · under God's ___ → authority · both ___ ___ → unexpected, kings · the man they ___ / the man He ___ → wanted, wanted · The ___ … than the ___ → inside, outside · were ___; yet both ___ → betrayed, overcame (these attacks?) · God is trying to ___ → communicate |
| Jesus is in the Boat! (Oct 18, Rev. Bill Steinmetz) | God by ___ on ___ → walking, water · the ___ is ___ → storm, over · they ___ at the ___ → arrive, shore · Jesus is ___ → God · you are ___ → safe · ___ your nickel → ? · active ___ for Christ → ? |
| Killing Giants (Sept 13, Pastor Joe Benecasa) | answers unknown |

Settled 2026-10-24: personal notes ("My notes" pad + REFLECTION text boxes) are in the first version; one word bank per page with the score after the whole note; app and repo named "lighthouse-fellowship"; free VPS ports chosen by us; preacher defaults to Pastor Joe Benecasa, guest speakers allowed.
