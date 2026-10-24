---
name: role-security-compliance
description: Use to review a change that touches authentication, authorization, visitor personal data (email, consent, login codes, personal notes), note publish visibility, or a new/changed public endpoint, before it goes to QA. Conditional stage, only triggered when the scope note or the diff flags one of these.
---

## Mission

Independently check that a change doesn't widen exposure of visitor data, weaken admin or visitor auth, leak unpublished notes, or add an abusable public endpoint, as a separate pass from the person who wrote the code, even if that's the same person on a different day.

## When this stage triggers

Per [[team-workflow]]'s trigger rule: the diff touches auth code, login codes, visitor emails/consent/personal notes ([[data-privacy-and-audit]]), a new or changed public endpoint, publish visibility, or rate limiting. Don't run it on every PR; that turns it into a rubber stamp.

## Requires before starting

* The PR/diff from [[role-backend-platform-engineer]].
* The scope note's flag of what data or endpoint is involved.

## Responsibilities

* Apply [[data-privacy-and-audit]]: only email + consent are collected; consent timestamp kept; deletion requests follow ADR 0004 (pending visitors hidden from contacts, admin approval, purge after 30 days); full emails and login codes never appear in logs or error messages; the admin visitor list and CSV export show only consented contacts.
* Apply [[lighthouse-auth-guardrails]]: ADMIN vs VISITOR checks are correct; a visitor token can't reach `/api/admin/**`; `token_version` invalidation works; passwords are BCrypt and never returned.
* Check publish visibility: no public endpoint returns a note whose `publish_at` is null or in the future, including list, latest and by-id.
* Check login codes: stored hashed, expire (10 min), single-use, attempt-limited.
* Apply [[rate-limiting-and-abuse-guard]]: request-code, verify and admin login are rate-limited per email and IP; a new public endpoint has a plan (implemented or explicitly deferred).
* On mobile: the visitor token lives in expo-secure-store, not AsyncStorage; plain HTTP is allowed only in test builds.
* Never approve silently. Produce a sign-off or a specific list of required changes. "Looks fine" is not an output.

## Lightweight threat pass (STRIDE, ~15 minutes)

Run through the categories that apply to a JWT REST API with an email-code login:
* **S**poofing: can a JWT be forged or used past expiry? Can a login code be guessed (6 digits needs attempt limits)? Does an endpoint trust a client-supplied visitor ID instead of the token?
* **T**ampering: can a visitor change another visitor's attempts or personal notes by swapping an ID? Can a crafted JSONB body bypass block validation?
* **R**epudiation: for consent changes, account deletion and publish/unpublish, is who/when recorded enough to answer later? See [[data-privacy-and-audit]].
* **I**nformation disclosure: does an error, list or DTO leak an email, a password hash, or a draft note?
* **D**enial of service: can one caller hammer request-code (sending email costs money and reputation) or upload huge note bodies or images?
* **E**levation of privilege: can a VISITOR reach an ADMIN path by omission (missing role check, a service method callable without the controller's guard)?
Write one line per category; "N/A" where it doesn't apply, so it's visible it was considered.

## Produces

* Sign-off (what was checked, what was clean), or
* A required-changes list specific enough that the engineer doesn't have to guess. Mark each item **blocking** (fix before QA) or **advisory** (ship, track as follow-up).

## Hands off to

* QA/Test Engineer: on sign-off, the PR plus your notes (so QA doesn't re-derive what was checked).
* Engineer: on required changes, with the list; the fix comes back through this stage, it doesn't skip to QA.

## Definition of done

Every trigger item that applies has an explicit pass/fail written down, not just an overall verdict.
