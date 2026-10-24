---
name: data-privacy-and-audit
description: Use whenever touching visitor data (email, contact consent, quiz attempts, personal notes), the visitor sign-in flow, the dashboard Visitors page or CSV export, delete-my-data, or logging around any of it. Enforces GDPR (Italy/EU) data minimization, consent, and erasure.
---

## Why this exists

Visitors are often tourists and one-time guests in Naples. Their email is personal data under GDPR, and the church has to be able to show it collected only what it needed, with consent, and can delete it on request. Apple also requires in-app account deletion for apps with sign-in. Anonymous use of the app is the default and must keep working without any personal data.

## What we collect, and nothing else

* `visitor`: email, `contact_consent`, `consent_at`, `created_at`, `last_seen_at`. No name, phone, location, device ID, or analytics profile unless the user explicitly decides to add one (and then the privacy policy changes first).
* `quiz_attempt` and `visitor_note_text`: tied to the visitor id.
* `email_login_code`: email + hashed code, short-lived. Delete or clear expired and consumed rows on a schedule.

## Rules

* **Signing in is not consent to be contacted.** `contact_consent` is a separate, unticked-by-default checkbox. Store `consent_at` whenever consent is given or withdrawn (`PATCH /api/me/consent`). If consent is withdrawn, the visitor disappears from the admin contact list immediately.
* **Personal notes are private.** `visitor_note_text` is visible only to the visitor who wrote it. No admin endpoint, dashboard page, export, statistic, or log reads it. Visitor endpoints load it by the visitor id from the token, never from a request parameter.
* **Admins see only consented contacts.** `GET /api/admin/visitors` and `export.csv` return only visitors with `contact_consent = true`, with email and consent date. No quiz scores or notes per person. Aggregate statistics later must not identify individuals.
* **Field-level checks.** Before adding a field to any response, check which role gets it. Admin responses never include visitor notes; public responses never include any visitor data.
* **Delete my data** follows ADR 0004: the visitor requests it in the app (`POST /api/me/deletion-request`, status `PENDING`) and immediately drops out of the contact list and CSV export; an ADMIN approves it in the dashboard (`APPROVED`, `purge_after` = approval + 30 days; there is no reject); the visitor can cancel until the purge; a daily job then hard-deletes the visitor row, attempts, personal notes and login codes in one transaction and marks the request `COMPLETED` with the visitor reference nulled. No soft delete. GDPR expects erasure within about a month of the request, so the dashboard must surface the age of pending requests. Backups still contain purged data until they rotate out; the privacy policy must say so.
* **Never log full emails or login codes.** Log the visitor id, or a masked email (`a***@example.com`) if needed. Never log request bodies of `/api/visitor-auth/*` or `/api/me/*`. See [[observability-and-logging]].
* **CSV export** is ADMIN only, consented contacts only, and is an access event: log who exported and when (admin id, row count), not the content. Guard against CSV formula injection (escape values starting with `=`, `+`, `-`, `@`).
* **Mobile.** The visitor token goes in `expo-secure-store`. Signing out or deleting the account removes the token and the visitor's synced data from the device; anonymous progress on the phone stays only if the visitor chooses.
* **Privacy policy** must exist before visitor sign-in goes live (phase 6) and must match what the code actually collects. A change to collected data is a change to the policy.
* When unsure whether something is personal data, treat it as personal data.

## Audit trail

Minimum, cheap: log admin access to visitor data (list view, CSV export) with admin id, action, row count, and timestamp. If a real compliance need appears, move it to a `pii_access_log` table via a Flyway migration ([[db-migration-strategy]]). Don't build more than that unasked.

## Checklist

1. Does this change collect a new piece of personal data? If so, did the user approve it and does the privacy policy cover it?
2. Does it expose visitor data to a wider role, or personal notes to anyone but their author?
3. Does it respect `contact_consent` and record `consent_at`?
4. Does the deletion purge still remove everything tied to the visitor, and does a pending request still hide them from the contact list?
5. Could any new log line contain a full email, a code, or a personal note?
6. Report which personal data the change touches, even if the answer is "none".
