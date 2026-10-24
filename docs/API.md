# Lighthouse Fellowship API

What the backend actually implements. Planned endpoints that don't exist yet stay in
`docs/PLAN.md` §6 (visitor sign-in, `/api/me/**`, visitors list and deletion requests arrive in phase 5).

## Base URLs

| Environment | URL |
|---|---|
| VPS testing (plain HTTP, no domain yet) | `http://<VPS_IP>:8099` |
| Local, Docker Compose | `http://localhost:8099` |
| Local, backend run directly | `http://localhost:8081` |
| Production | not chosen yet (phase 6, HTTPS) |

## Conventions

* JSON in and out. Dates are `YYYY-MM-DD`; instants are ISO-8601 UTC (`2026-09-13T07:00:00Z`).
* Auth: `Authorization: Bearer <token>`. Only admin tokens exist so far.
* Unknown fields in a request body are rejected with `400` (`"Unknown field: blocks[0].color"`).
* Every response has an `X-Request-Id` header. Clients may send their own `X-Request-Id`
  (8–64 letters, digits or `-`) so an error can be matched to a server log line.
* Mobile clients must ignore response fields they don't know; fields will be added over time.

### Errors

Every error has the same shape:

```json
{
  "timestamp": "2026-09-10T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Block 2 (b2) PARAGRAPH: segments, segment 1: the answer for blank k1 must be 1 to 3 words (got 4)",
  "path": "/api/admin/notes"
}
```

| Status | When |
|---|---|
| 400 | Validation failed (body, query parameter, sermon note content, not a Sunday, bad UUID), wrong current password |
| 401 | No token, invalid or expired token, wrong login. Clients treat it as "signed out" |
| 403 | Signed in but not allowed (also any path that has no access rule) |
| 404 | Not found, **or not published yet** on a public endpoint |
| 409 | Another note already exists for that Sunday |
| 413 | Uploaded file over 10 MB |
| 429 | Too many attempts; `Retry-After` header gives the seconds to wait |
| 502 | Cloudinary upload failed |

## Sermon note content (`blocks`)

A note is an ordered list of blocks (PLAN §4, ADR 0002). Every block has an `id` (unique in the note,
1–40 of `A-Z a-z 0-9 - _`) and a `type`. Clients generate the ids and must keep them stable when a note is
edited, because game attempts and personal notes refer to them.

| `type` | Fields | Notes |
|---|---|---|
| `HEADING` | `segments`, `numbered` | `numbered: true` → auto I, II, III; `false` (default) → plain label like "Let's be clear!" |
| `SCRIPTURE` | `text`, `reference` | both required; `reference` is free text ("1 Samuel 24:4A 6:12") |
| `PARAGRAPH` | `segments`, `align` | `align`: `LEFT` (default) or `CENTER` |
| `LIST` | `items` | each item is one numbered line, itself a list of segments |
| `REFLECTION` | `prompt` | the visitor types personal notes under it |

A field that doesn't belong to the type (e.g. `segments` on `SCRIPTURE`) is rejected.

A **segment** is either text or a blank:

```json
{ "text": "The question before us this morning is not " }
{ "blankId": "k1", "answer": "if" }
```

* `blankId`: unique across the whole note, same character rules as block ids.
* `answer`: 1–3 words, at most 60 characters. The server trims it and collapses inner whitespace.
* Text segments are stored exactly as sent (the spaces around a blank matter) and must not be empty.
* Limits: 200 blocks, 50 items per list, 100 segments per line, 50,000 characters of text in total.

Blank answers are included in public responses on purpose (ADR 0003).

Example: see `backend/src/test/resources/fixtures/notes/` for the three sample notes in full.

```json
[
  { "id": "b1", "type": "SCRIPTURE",
    "text": "...David took his staff in his hand, chose five smooth stones...",
    "reference": "1 Samuel 17:40-47" },
  { "id": "b2", "type": "PARAGRAPH", "align": "CENTER",
    "segments": [
      { "text": "The question before us this morning is not " },
      { "blankId": "k1", "answer": "if" },
      { "text": " we are going to " },
      { "blankId": "k2", "answer": "face" },
      { "text": " giants." }
    ] },
  { "id": "b3", "type": "HEADING", "numbered": true,
    "segments": [ { "text": "God will prepare us to fight the enemy." } ] },
  { "id": "b4", "type": "LIST",
    "items": [
      [ { "text": "Jesus is " }, { "blankId": "k3", "answer": "God" }, { "text": "." } ]
    ] },
  { "id": "b5", "type": "REFLECTION", "prompt": "What is God showing me as His 'safe' adventure for Him?" }
]
```

### `contentVersion`

Starts at 1 and goes up whenever anything the app shows changes (title, preacher, date, blocks, cover image).
Publishing and unpublishing don't change it. The app compares it with its offline copy to know when to refetch.

---

## Public (no token)

Only published notes (`publishAt` set and in the past) are ever returned. A draft, a scheduled note and a
missing note all give the same `404`.

Public note responses carry `Cache-Control: no-cache` and an `ETag`. Send `If-None-Match: <etag>` to get
`304 Not Modified` when nothing changed.

### `GET /api/notes`

Published note summaries, newest Sunday first, for the year → month → Sunday archive.

| Query | Required | |
|---|---|---|
| `year` | no | e.g. `2026` (2000–2100). Omitted → every published note |

`GET http://<VPS_IP>:8099/api/notes?year=2026`

```json
[
  {
    "id": "325417ef-e713-4cea-a372-f453cc9cd671",
    "title": "Killing Giants",
    "sermonDate": "2026-09-13",
    "coverImageUrl": "https://res.cloudinary.com/<cloud>/image/upload/v1/lighthouse-fellowship/covers/325417ef-...-1a2b3c4d.jpg",
    "contentVersion": 1
  }
]
```

`coverImageUrl` is `null` when the note has no cover. Errors: `400` for an invalid year.

### `GET /api/notes/latest`

The published note with the most recent Sunday ("this Sunday's note"). Same body as `GET /api/notes/{id}`.
`404` when nothing is published yet.

### `GET /api/notes/{id}`

```json
{
  "id": "325417ef-e713-4cea-a372-f453cc9cd671",
  "title": "Killing Giants",
  "preacherName": "Pastor Joe Benecasa",
  "sermonDate": "2026-09-13",
  "coverImageUrl": null,
  "contentVersion": 1,
  "blocks": [ "…see Sermon note content…" ]
}
```

Errors: `404` (missing or not published), `400` (id is not a UUID).

### `GET /actuator/health`

`{"groups":["liveness","readiness"],"status":"UP"}`. Used by the Docker healthcheck and the deploy.

---

## Admin auth

### `POST /api/auth/login` (public)

```json
{ "email": "admin@example.com", "password": "<password>" }
```

`200`:

```json
{
  "token": "<jwt>",
  "tokenType": "Bearer",
  "expiresAt": "2026-09-10T18:00:00Z",
  "admin": {
    "id": "bda4ba44-ad72-4d9f-822a-7aa1ef339baa",
    "email": "admin@example.com",
    "displayName": "Pastor Joe Benecasa",
    "role": "ADMIN"
  }
}
```

* Tokens last 8 hours (`JWT_ADMIN_EXPIRATION_MS`). There is no refresh; sign in again.
* Email is case-insensitive.
* `401` with the same message (`"Invalid email or password"`) for an unknown email and a wrong password.
* `429` after 10 attempts per minute from one IP, or 5 attempts per 15 minutes for one email.
* There is no sign-up. The first admin is created from `ADMIN_SEED_*` env vars on startup.

---

## Admin (ADMIN token)

Every `/api/admin/**` endpoint returns `401` without a valid admin token.

### `GET /api/admin/account`

The signed-in admin. The dashboard can call it on startup to check its stored token.

```json
{ "id": "bda4ba44-…", "email": "admin@example.com", "displayName": "Pastor Joe Benecasa", "role": "ADMIN" }
```

### `PATCH /api/admin/account/password`

```json
{ "currentPassword": "<current>", "newPassword": "<12 to 72 characters>" }
```

`200` with a new login response (same shape as `POST /api/auth/login`). **Every token issued before this,
on every device, stops working**; the dashboard must switch to the returned token.
Errors: `400` wrong current password (`"Current password is incorrect"`; deliberately not 401, which clients treat as an expired session) or new password too short/too long, `429` after 10 attempts
per 15 minutes from one IP.

### `GET /api/admin/notes`

All notes including drafts and scheduled ones, newest Sunday first. No `blocks`.

| Query | Required | |
|---|---|---|
| `year` | no | 2000–2100 |
| `month` | no | 1–12, needs `year` |

```json
[
  {
    "id": "325417ef-…",
    "title": "Killing Giants",
    "preacherName": "Pastor Joe Benecasa",
    "sermonDate": "2026-09-13",
    "coverImageUrl": null,
    "contentVersion": 1,
    "publishAt": "2026-09-13T07:00:00Z",
    "status": "SCHEDULED"
  }
]
```

`status` is computed from `publishAt` and the current time:
`DRAFT` (`publishAt` null), `SCHEDULED` (in the future), `PUBLISHED` (in the past).
The dashboard's *Empty* state is a Sunday with no note in this list.

### `GET /api/admin/notes/{id}`

The full admin view:

```json
{
  "id": "325417ef-…",
  "title": "Killing Giants",
  "preacherName": "Pastor Joe Benecasa",
  "sermonDate": "2026-09-13",
  "coverImageUrl": null,
  "contentVersion": 1,
  "publishAt": null,
  "status": "DRAFT",
  "blocks": [ "…" ],
  "createdAt": "2026-09-10T10:00:00Z",
  "updatedAt": "2026-09-10T10:00:00Z"
}
```

### `POST /api/admin/notes` → `201`

```json
{
  "title": "Killing Giants",
  "sermonDate": "2026-09-13",
  "preacherName": "Pastor Joe Benecasa",
  "blocks": [ "…" ]
}
```

* `title`: required, max 200. `sermonDate`: required, **must be a Sunday**, one note per Sunday.
* `preacherName`: optional, max 120; blank or missing → "Pastor Joe Benecasa".
* `blocks`: required; `[]` is a valid empty draft.
* A new note is always a draft. Don't send `id`, `contentVersion`, `publishAt`, `status` or timestamps
  (they're rejected as unknown fields).

Response: the full admin view. Errors: `400` (validation, not a Sunday), `409` (that Sunday already has a note).

### `PUT /api/admin/notes/{id}`

Same body as create; replaces title, date, preacher and blocks. Doesn't change publish state.
`contentVersion` goes up only if something actually changed. Errors: as create, plus `404`.

### `DELETE /api/admin/notes/{id}` → `204`

Deletes the note and its cover image. Works on published notes too; phones that already cached it keep
their copy. Errors: `404`.

### `POST /api/admin/notes/{id}/cover-image`

`multipart/form-data` with one part named `file`: a JPEG, PNG or WebP image (checked by content, not by
file name), at most 10 MB. Uploaded to Cloudinary; the previous cover is deleted. Bumps `contentVersion`.

```
curl -X POST http://<VPS_IP>:8099/api/admin/notes/<id>/cover-image \
  -H "Authorization: Bearer <token>" -F "file=@giants.jpg"
```

Response: the full admin view with the new `coverImageUrl`.
Errors: `400` (no file, not an image), `404`, `413` (over 10 MB), `502` (Cloudinary failed; try again).

### `PATCH /api/admin/notes/{id}/publish`

```json
{ "publishAt": "2026-09-13T07:00:00Z" }
```

* Body optional. No body or no `publishAt` → publish now.
* A future time schedules the note; it appears in the app at that moment, with no further action.
* Can be called again to change the time.
* `400` if the note has no blocks. `404` if missing.

### `PATCH /api/admin/notes/{id}/unpublish`

Back to draft (`publishAt` null). It disappears from the public endpoints at once. `404` if missing.
