---
name: dashboard-builder
description: Use when building or changing the Lighthouse Fellowship admin web dashboard in dashboard/ (React + Vite + TypeScript), including login, the notes calendar, the block editor with blanks, cover upload, preview, scheduling, the visitors list and account settings.
---

The dashboard is where the pastor and church admins write, schedule and publish sermon notes. Only the ADMIN role exists. Screens are in `docs/PLAN.md` §8; product rules in [[lighthouse-domain-rules]]. Built in phase 2: login, notes calendar, account/password change, the note editor (`features/notes-editor/`: `segments.ts` make-blank rules, `noteDraft.ts` validation mirroring the backend, `romeTime.ts` schedule conversion) and a continuous paper preview. The paginated preview waits for the shared pack function from phase 3. Docker image: `dashboard/Dockerfile`, unprivileged nginx on 8080, host port 8100. Wrong-current-password on password change is a 400, so the client's "any 401 signs out" rule stays simple.

## Stack

React + Vite + TypeScript (strict), React Router, TanStack Query. Tests with Vitest + React Testing Library ([[lighthouse-testing-review]]). Served in production as a static build from a small nginx container on VPS port 8100.

## Folder Layout

```
dashboard/src/
├── pages/                  one component per route: LoginPage, NotesPage, NoteEditorPage, VisitorsPage, AccountPage
├── components/             shared UI (Button, Field, Modal, Sidebar, StatusBadge)
├── features/notes-editor/  block list, block editors, make-blank, preview, publish controls
├── api/                    fetch client, endpoint functions, query keys, types
├── auth/                   token storage, AuthProvider, RequireAdmin route guard
└── theme/                  tokens (CSS variables), fonts
```

Pages compose features; logic stays out of page files. Shared types for note content live in `src/api/types.ts` and match `docs/API.md` and PLAN §4.

## Plain HTTP until phase 6

The live dashboard is served over `http://<VPS_IP>:8100`, which browsers do not treat as a secure context. APIs that exist only on HTTPS or `localhost` are **undefined** there even though they work in local dev and in jsdom tests: `crypto.randomUUID` (use `crypto.getRandomValues`), `crypto.subtle`, `navigator.clipboard`, service workers. This broke "add block" once. Add a test that removes the API when you touch anything near these.

## API Client

* Base URL from `VITE_API_URL` (build-time; plain HTTP to the VPS IP during testing, HTTPS at release). Never put secrets in `VITE_*` variables; they ship to the browser.
* One fetch wrapper in `src/api/client.ts` adds `Authorization: Bearer <token>`, parses `ApiErrorResponse`, and throws a typed error.
* All server state goes through TanStack Query; mutations invalidate the matching query keys (`['admin-notes', year, month]`, `['admin-note', id]`).
* Cover image upload is a multipart `POST /api/admin/notes/{id}/cover-image`; Cloudinary keys stay on the backend.

## Auth

* Login with email + password at `POST /api/auth/login`; only an ADMIN token is accepted.
* Store the token in `sessionStorage` (cleared when the browser closes) and hold it in an `AuthProvider` context. Do not use cookies without CSRF protection; do not keep it in `localStorage`.
* Any 401 from the API clears the token and redirects to `/login`, keeping the intended path to return to. A 403 shows an error page, not a logout.
* All routes except `/login` sit behind `RequireAdmin`.
* Never log the token, passwords, or visitor emails to the console. See [[lighthouse-auth-guardrails]].

## Notes Calendar

* List by month showing every Sunday with status *Empty*, *Draft*, *Scheduled (date and time)* or *Published*, computed from `publishAt` against the current time.
* Clicking an Empty Sunday opens a new note pre-filled with that date.
* Show times in the church's time zone (Europe/Rome) and send ISO timestamps with offset.

## Note Editor Rules

* Fields: title, Sunday date (only Sundays selectable), preacher pre-filled with "Pastor Joe Benecasa" and editable for guests, cover image.
* Block list: add Heading, Scripture, Paragraph, Numbered list or Reflection; drag to reorder (with keyboard alternatives: move up/down buttons); delete with confirmation built into the page.
* Every block and blank gets a stable ID when created (e.g. `crypto.randomUUID()` or short IDs). Reordering, editing and turning blanks back into text never renumber existing IDs; visitor attempts and personal notes refer to them.
* Make blank: the admin selects words inside a segment and clicks "Make blank". The selection is trimmed and must be 1–3 whole words; otherwise the button is disabled with a short reason. The selection splits the text segment into text / blank / text.
* Blanks appear as highlighted chips showing the answer; a chip can be turned back into text, merging with neighboring text segments.
* Blanks work in headings, paragraphs and list items, and two blanks can sit side by side.
* Scripture: text plus free-text reference, rendered italic with right-aligned reference.
* Validate before saving with the same rules as the backend validator, and still show backend 400 messages next to the block they name.
* Warn before leaving the page with unsaved changes.

## Preview

* A phone-sized frame next to the editor (with a tablet toggle) renders the note with the same layout and the same pagination rules as the mobile app: measure blocks at the frame width, pack into pages, repeat header and footer, split long scripture at sentence boundaries.
* Keep the packing logic a pure TypeScript function identical to the mobile one (shared module or a copied file kept in sync, with the same unit tests). See [[mobile-app-builder]].
* The preview shows blanks as lines (Read mode) with a toggle to show answers.

## Publishing

* "Publish now" or "Schedule" with a date and time; "Unpublish" returns the note to draft. Uses `PATCH /api/admin/notes/{id}/publish` and `.../unpublish`.
* Show clearly when a scheduled note will appear in the app.

## Visitors and Account

* Visitors page lists consented contacts only, with CSV export via the backend endpoint. Personal notes and scores are never shown. Treat the list as personal data ([[data-privacy-and-audit]]). A **Deletion requests** tab lists pending requests with their age in days (highlighted after 7 days, because GDPR expects erasure within about a month) and an Approve button, plus approved requests with their purge date (ADR 0004).
* Account page: change password. Managing other admins comes later; do not build it.

## Theme (PLAN §11)

Tokens as CSS variables in `src/theme`; components never hardcode colors.

* Navy `#1F2A4A`: text, headings, sidebar
* Lighthouse red `#C62828`: primary buttons, active states
* Beam yellow `#F4C542`: blank chips in the editor, "new" badges
* Paper `#FBF8F1`: preview page background

Serif for titles and headings, sans serif for body, italics for scripture, matching the mobile reader. Logo from `docs/brand/`. English only.

## Checklist

1. Types match `docs/API.md`.
2. Every request goes through the client wrapper and TanStack Query.
3. 401 logs out; token not in `localStorage` or logs.
4. Blank rule (1–3 words) enforced in the editor and covered by a test.
5. IDs stay stable through edits and reorder.
6. Preview uses the shared pagination function.
7. Nothing from "Do Not Implement Yet" added.
