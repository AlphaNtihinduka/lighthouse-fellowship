---
name: rate-limiting-and-abuse-guard
description: Use when touching public endpoints (admin login, visitor request-code and verify, public note reads), rate limiting itself, or any endpoint that sends email or creates records from unauthenticated input.
---

## Status

Built in phase 1: `config/RateLimitingFilter` (plain `bucket4j-core`, in-memory `ConcurrentHashMap<String, Bucket>` buckets, in the Security chain before the JWT filter, servlet auto-registration disabled in `SecurityConfig`, `429` + `Retry-After`). It covers `POST /api/auth/login` (10/min per IP, 5/15 min per email) and `PATCH /api/admin/account/password` (10/15 min per IP). Phase 5 adds the visitor code endpoints. Forwarded headers are trusted only when `RATE_LIMIT_TRUST_FORWARDED_HEADERS=true` (phase 6, behind Nginx). Known gap: the bucket maps are never pruned, so a spray of distinct emails grows memory until restart; add eviction if that ever shows up in `docker stats`.

## What to protect

| Endpoint | Limit keys | Why |
|---|---|---|
| `POST /api/auth/login` | per IP and per normalized email, checked independently | Password guessing; rotating IPs still hits the per-email bucket |
| `POST /api/visitor-auth/request-code` | per normalized email and per IP | Each call sends an email: costs money, can spam a stranger's inbox, and can burn the sending domain's reputation |
| `POST /api/visitor-auth/verify` | per IP, plus an attempt cap on the code itself | A 6-digit code has only a million values |
| `GET /api/notes*` | none needed at first; keep them cheap | Public, read by every app on Sunday morning |

Starting numbers (tune later): login 10/min per IP and 5/15 min per email; request-code 3/15 min and 10/day per email, 20/hour per IP; verify 10/15 min per IP.

## Login code rules

* Store `code_hash` (never the plain code), expire after 10 minutes, single use (`consumed_at`).
* Count wrong guesses in `email_login_code.attempts`; after 5, the code is dead and the visitor must request a new one. This cap is enforced in the database row, so it holds even when the in-memory buckets reset on restart.
* A new code request invalidates earlier unused codes for that email.
* Compare codes in constant time.
* `request-code` returns the same response whether or not the email already has a visitor account. Login errors don't reveal whether an admin email exists.
* Never log the code or the full email ([[data-privacy-and-audit]]).

## Public note reads stay cheap

* Only published notes (`publish_at` not null and in the past) are returned.
* `GET /api/notes?year=` returns summaries only, never the full `content`.
* Add `Cache-Control` / `ETag` (based on `content_version`) so the app and any proxy can avoid refetching. Use indexes on `publish_at` and `sermon_date`.
* If public reads ever need a limit, set a generous per-IP one; a church Wi-Fi puts many phones behind one IP.

## Rules

* Every new public endpoint gets an explicit rate-limit decision, even "deferred, noted as a gap". The filter matches exact paths; a new endpoint is not covered automatically.
* **Client IP behind a proxy.** Read the IP from `X-Forwarded-For` (first hop), then `X-Real-IP`, then `getRemoteAddr()`. Only trust these headers when the request came through the host Nginx (phase 6); before that, clients connect directly and can forge them, so use `getRemoteAddr()`. Getting this wrong either puts every caller in one bucket or lets an attacker pick their own key.
* **Spring auto-registers any `Filter` bean** at the servlet level in addition to the Security chain, so the filter runs twice and consumes two tokens per request. Add a disabled `FilterRegistrationBean` for every filter bean added to the Security chain, and check the boot log says it was not registered.
* Tests: real HTTP, a different test IP per test (buckets live for the whole test context), exact trip counts.
* CAPTCHA is an escalation to propose, not to add silently.
* In-memory buckets reset on restart; fine for one container, move to a shared store or Nginx beyond that.

## Checklist

1. Is this a new or changed public endpoint? Does it have a rate-limit plan?
2. Are limits keyed correctly (per IP and per email where relevant), returning `429` + `Retry-After`?
3. Are login codes hashed, expiring, single-use, and attempt-capped in the database?
4. Do responses avoid revealing whether an email exists?
5. Does a new filter bean have a disabled `FilterRegistrationBean`?
6. Report public endpoints added or changed and whether they have abuse protection.
