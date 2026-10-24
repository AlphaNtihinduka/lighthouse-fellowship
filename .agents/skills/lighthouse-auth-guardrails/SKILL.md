---
name: lighthouse-auth-guardrails
description: Use when adding or changing authentication, authorization, JWT handling, SecurityConfig matchers, the admin login or seeder, the visitor email-code sign-in, or any endpoint under /api/admin/** or /api/me/** in Lighthouse Fellowship.
---

Use this skill whenever auth or access control is involved. There are exactly two kinds of signed-in caller, and they must never be confused.

## Two Token Types

| | ADMIN | VISITOR |
|---|---|---|
| Who | Pastor / church admins in the dashboard | Optional mobile users who chose "Save my progress" |
| Sign-in | `POST /api/auth/login` with email + password | `POST /api/visitor-auth/request-code`, then `POST /api/visitor-auth/verify` with the 6-digit code |
| Stored in | `admin_user` (BCrypt `password_hash`, `token_version`) | `visitor` (email, consent; no password) |
| Token | JWT, audience `lighthouse-admin`, claim `role=ADMIN`, claim `tv` = token_version | JWT, audience `lighthouse-visitor`, claim `role=VISITOR`, subject = visitor UUID |
| Reaches | `/api/admin/**`, `/api/auth/me`-style admin account endpoints | `/api/me/**` only |

Rules:

* The JWT filter checks the audience before loading a principal. An admin-audience token is resolved only against `admin_user`; a visitor-audience token only against `visitor`. A visitor token with a forged `role=ADMIN` claim must still fail because its audience and lookup table are wrong.
* `/api/admin/**` requires `hasRole("ADMIN")`; `/api/me/**` requires `hasRole("VISITOR")`. An ADMIN token on `/api/me/**` is rejected too (admins are not visitors).
* Use separate signing keys or at least separate audiences plus separate principal types. Prefer separate keys (`JWT_ADMIN_SECRET`, `JWT_VISITOR_SECRET`) so a leaked visitor key cannot mint admin tokens. Never hardcode secrets; see [[secrets-and-config-management]].
* Admin tokens are short-lived (hours). Visitor tokens can be long-lived (weeks to months) because the app must stay signed in; deleting the visitor invalidates them because the lookup fails.
* `token_version`: incremented on password change (and on "log out everywhere" if added). The filter rejects an admin token whose `tv` claim does not match the stored value.
* An invalid, expired or wrong-audience token must not break a public endpoint: the filter leaves the context unauthenticated and lets SecurityConfig decide, as in SponsorDirect's `JwtAuthenticationFilter`.

## Public Endpoint Allowlist

Only these are `permitAll`:

* `GET /api/notes`, `GET /api/notes/latest`, `GET /api/notes/{id}` (published notes only; see [[lighthouse-domain-rules]])
* `POST /api/visitor-auth/request-code`, `POST /api/visitor-auth/verify`
* `POST /api/auth/login`
* `GET /actuator/health`
* `OPTIONS /**` and `/error` (so real error statuses are not turned into 401)

Everything else needs an explicit matcher with a role, declared more specific first. A new controller method that falls through to `.anyRequest().authenticated()` is an authorization gap: an authenticated visitor would pass. End the chain with `.anyRequest().denyAll()` or `authenticated()` only after every real path has a role matcher.

## Visitor Ownership

* `/api/me/**` services take the visitor ID from the authenticated principal, never from the path or body.
* Queries are scoped by visitor ID (`findByVisitorIdAndNoteId`, `deleteByVisitorId`). Never load by row ID and compare afterwards.
* Attempt and personal-note writes check that the note exists and is published.

## Email Login Codes

* 6 digits from `SecureRandom`.
* Stored as a hash (HMAC-SHA256 with a server secret, or BCrypt) in `email_login_code.code_hash`; never stored or logged in plain text.
* Expire after 10 minutes (`expires_at`).
* Single use: set `consumed_at` on success; a consumed or expired code always fails.
* Requesting a new code invalidates earlier unused codes for that email.
* At most 5 wrong attempts per code (`attempts`), then the code is dead and the visitor must request a new one.
* `request-code` is rate-limited per email and per IP; `verify` is rate-limited per IP. See [[rate-limiting-and-abuse-guard]].
* `request-code` returns the same response whether or not the email is known (no account enumeration).
* Comparison uses a constant-time check.
* Never log full emails or codes; mask emails (`j***@example.com`). See [[observability-and-logging]] and [[data-privacy-and-audit]].
* Consent: `contactConsent` and `consent_at` are recorded at verify time and changed only via `PATCH /api/me/consent`.

## Admin Accounts

* Passwords are BCrypt-hashed. No DTO, log line or error message contains a password or hash.
* There is no admin self-registration. The first admin comes from an `AdminSeeder` on startup reading `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, `ADMIN_SEED_DISPLAY_NAME` from env; it creates the user only if no admin with that email exists and never overwrites an existing password. Missing env means no seeding, with a warning, not a crash.
* Login failures return the same 401 message for unknown email and wrong password. Rate-limit `POST /api/auth/login`.
* Only the ADMIN role exists. Do not add SECRETARY, MEDIA or other roles until explicitly requested.

## Anonymous Mode Must Always Work

* The mobile app reads and plays every published note with no token at all. Never put a public read behind auth "temporarily".
* If the visitor token is expired, revoked, or the account was deleted, the app falls back to anonymous mode and keeps local progress; it must not lock the reader.

## Security Checklist

1. Every new endpoint has an explicit SecurityConfig matcher with the right role.
2. Visitor token rejected on every `/api/admin/**` path; admin token rejected on `/api/me/**`; anonymous rejected on both (tests in [[lighthouse-testing-review]]).
3. Audience and principal type checked in the filter, `token_version` checked for admins.
4. Stateless sessions, CSRF disabled, CORS limited to the dashboard origin (the mobile app is not a browser and needs no CORS).
5. Codes hashed, expiring, single-use, attempt-limited, rate-limited, never logged.
6. No password, hash, code or full email in any response or log.
7. Seeder reads env only and never overwrites.
8. When security config changes, report exactly which endpoints became public or private and which roles changed.
