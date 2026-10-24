---
name: lighthouse-domain-rules
description: Use when implementing or reviewing any Lighthouse Fellowship product logic (sermon notes, blocks and blanks, publish scheduling, word bank, scoring, personal notes, preacher, visitors) in the backend, dashboard or mobile app, so the work respects the confirmed scope and avoids features that are not wanted yet.
---

Lighthouse Fellowship turns the paper sermon notes of Lighthouse Fellowship Napoli (ICF Napoli) into a phone app. The pastor writes notes in the web dashboard; visitors read them in the mobile app and fill in the blanks as a drag-and-drop word game.

The source of truth is `docs/PLAN.md` (§2 requirements, §4 content model, §6 API, §7 mobile, §8 dashboard) and the ADRs in `docs/decisions/`. When this skill and PLAN.md disagree, PLAN.md wins; flag the conflict to the user instead of silently picking one.

## Current Scope

* Sermon notes: one note per Sunday, written as an ordered list of blocks.
* ADMIN users who write, schedule and publish notes in the dashboard.
* Visitors who read and play anonymously, and can optionally sign in with an emailed code to sync progress and personal notes.
* A consented visitor contact list for the church (list + CSV export).

## Note Rules

* Notes are Sunday-only. `sermon_date` must be a Sunday and is unique: one note per Sunday.
* One note equals one paper sheet (front and back). "(con't)" is just the second page; there are no multi-part series.
* The archive is browsed by year → month → Sunday.
* A note is visible to the public only when `publish_at` is set and `publish_at <= now`. `publish_at` null means draft; a future `publish_at` means scheduled. Neither may ever appear on a public endpoint, including the list, `latest`, and get-by-id (return 404, not 403, so existence does not leak).
* "Now" comes from an injected `Clock`, not `Instant.now()` scattered through the code, so visibility is testable.
* `contentVersion` increases whenever the content changes, so the app can tell a cached note is stale.

## Content Model (PLAN §4, ADR 0002)

* Content is a JSON list of blocks stored in one validated JSONB column on `sermon_note`. A note is always read and saved whole.
* Block types: `HEADING` (segments, `numbered`), `SCRIPTURE` (text, free-text `reference`), `PARAGRAPH` (segments, `align` LEFT/CENTER), `LIST` (items, each a list of segments, numbered 1, 2, 3), `REFLECTION` (prompt; the visitor types personal notes).
* A segment is either `{ "text": "..." }` or `{ "blankId": "...", "answer": "..." }`. Blanks work the same way in every block type that has segments.
* Two blanks can sit side by side ("both ______ ______." → "unexpected", "kings").
* Block `id`s are unique within a note; `blankId`s are unique within a note. Personal notes and attempts refer to these IDs, so editing a note must keep existing IDs stable.
* A blank's answer is 1–3 words after trimming; empty answers and answers of 4+ words are rejected. The backend enforces this on save; the dashboard enforces it while editing.
* Page breaks are not stored. The client measures and paginates; the pastor only writes blocks.
* New block types or fields extend the JSON format and the validator, not the database schema.

## Word Game

* Each rendered page has its own word bank (tray) containing only the correct answers for the blanks on that page, shuffled. No distractor words. Pages without blanks have no tray.
* Pages depend on screen size, so trays differ between phone and tablet; that is expected.
* A blank's drawn width does not depend on answer length (no hint).
* Drag a chip onto a blank, drag it back out to remove; tap chip then tap blank must also work.
* The score is shown once, after the whole note is completed ("8 / 10"), not per page. Replay is allowed.
* Scoring compares the placed chip to the blank's answer. Two blanks with the same answer text ("wanted", "wanted") are interchangeable: either chip counts as correct in either blank.
* Attempts are saved on the device first and uploaded later when signed in. Each attempt carries a `client_attempt_id` so repeated uploads are safe.

## Answers Are Sent to the Client (ADR 0003)

Public note reads include the blank answers on purpose. The word bank shows the correct answers anyway, so hiding them protects nothing, and sending them lets the game score offline. Do not "fix" this by stripping answers or adding a server-side scoring endpoint. The real protection is publish visibility: answers of unpublished notes must never leave the server through a public endpoint.

## Personal Notes

* A "My notes" pad per sermon note (`block_id` null) plus a text box in each `REFLECTION` block.
* Private to the visitor: saved on the phone, synced only when signed in, never shown to admins, never in the visitor export, never logged.
* Deleted with the visitor account.

## Preacher

* `preacherName` defaults to "Pastor Joe Benecasa" (dashboard pre-fills it; backend uses it when blank).
* Guest speakers are free text per note (e.g. "Rev. Bill Steinmetz"). There is no preacher table.

## Visitors

* Only email + contact consent (+ consent timestamp) are collected. No names, phone numbers, device IDs or analytics profiles.
* The admin contact list shows only visitors with `contact_consent = true`.
* Delete my data: requested in the app, approved by an admin, purged 30 days after approval, cancellable until then (ADR 0004). See [[data-privacy-and-audit]].

## Language

English only in every UI string, email and error message. No i18n framework yet.

## Do Not Implement Yet

* Admin roles other than ADMIN (secretary, media team) or admin management screens
* Push notifications (e.g. "new note published")
* Statistics or analytics ("most missed blank", play counts)
* Sharing a note as a link or social share
* Multiple languages / translations
* Payments, donations or giving
* Comments, chat, prayer requests, or any other user-generated content beyond private personal notes

If a request touches one of these, confirm with the user before building it. See [[role-product-manager]] for scope calls.

## Feature Guardrails

* Build only what the request needs; the three sample notes in PLAN §14 are the test of whether the content model is enough.
* Keep the backend, dashboard preview and mobile reader agreeing on one content format; a format change touches all three plus the validator and `docs/API.md`.
* Auth rules live in [[lighthouse-auth-guardrails]]; build steps in [[lighthouse-feature-builder]].
