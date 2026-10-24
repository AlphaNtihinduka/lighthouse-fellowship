# ADR-0004: Visitor data deletion is requested in the app, approved by an admin, and carried out 30 days later

Date: 2026-10-24
Status: Accepted

## Context

Visitors who sign in to sync progress give us their email, and their quiz attempts and personal notes are stored against it. GDPR (Italy/EU) gives them the right to erasure, and Apple requires apps with account creation to let users start account deletion inside the app. The user (church) wants a human to see each deletion and a grace period before data is gone for good.

## Decision

1. **Request.** Signed-in visitor taps "Delete my data" → `POST /api/me/deletion-request`. A `visitor_deletion_request` row is created as `PENDING`. From that moment the visitor is excluded from the admin contact list and CSV export, and the app signs them out on that device.
2. **Approval.** An admin sees pending requests in the dashboard and approves → `APPROVED`, with `purge_after = approved_at + 30 days`. There is no reject: erasure is the visitor's right, so the admin's role is to acknowledge, not to decide.
3. **Grace period.** Until `purge_after`, the visitor can sign in again and cancel (`DELETE /api/me/deletion-request`) → `CANCELLED`, and everything is restored as it was (including the contact list, if they had consented).
4. **Purge.** A daily scheduled job hard-deletes, in one transaction, the visitor row, attempts, personal notes and login codes of every `APPROVED` request past `purge_after`, then marks it `COMPLETED`. The request row is kept without any personal data (visitor reference nulled) as the record that the erasure happened.

## Alternatives considered

* **Immediate self-service hard delete** (the first draft). Rejected by the user: no grace period for mistakes and no visibility for the church.
* **Soft delete / anonymize.** Rejected: unlike SponsorDirect, no other record depends on a visitor, so there's nothing worth keeping.

## Consequences

* **GDPR timing risk.** GDPR expects erasure "without undue delay", normally within one month of the request. Request → approval → 30 days can exceed that if approval is slow. Mitigation: the dashboard highlights pending requests and shows how many days old each one is; admins should approve within a few days. Revisit if requests sit unapproved.
* **Apple review risk.** Deletion starts in the app, which Apple requires. The admin step and grace period must be explained in the app ("Your data will be deleted 30 days after we confirm your request") and in the privacy policy.
* Database backups still contain purged data until they rotate out; the privacy policy must say so.
* Needs a scheduled job (`@EnableScheduling`) and a Clock-injectable service so the 30-day rule is testable.
