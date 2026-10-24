---
name: api-contract-and-postman-docs
description: Use when adding or modifying REST endpoints in backend/. Keeps docs/API.md an accurate contract for the dashboard and the mobile app and for Postman testing, including method, URL, auth role, request body, response body, and errors.
---

Whenever endpoints are added or changed, document them in `docs/API.md` (not the README), grouped by area: Public, Visitor, Admin. `docs/PLAN.md` §6 is the planned endpoint list; `docs/API.md` describes what actually exists.

## Two consumers, one of them can't be updated

* **Dashboard** (`dashboard/`): deployed together with the backend, so it can change in the same release.
* **Mobile app** (`mobile/`): once a build is in the stores, old versions stay installed and cannot be force-updated. After the app ships, changes to existing endpoints are **additive only**: new optional request fields, new response fields, new endpoints. Never rename or remove a field, change its type or meaning, tighten validation on an existing field, or change a status code the app relies on. Clients must ignore unknown response fields; flag it if mobile code does not.
* Before the first store release, breaking changes are allowed but must update `docs/API.md`, the dashboard, and the mobile app together.
* If a breaking change becomes truly necessary after release, stop and raise it with the user (a new endpoint or a versioned path); there is no API versioning scheme yet.

## For Each Endpoint Include

* Area (Public / Visitor / Admin) and feature
* HTTP method and URL path
* Example with the current base URL
* Required role (none, VISITOR, or ADMIN) and whether a bearer token is required
* Request body JSON, success response JSON, common errors (400, 401, 403, 404, 409, 429)
* Notes for client developers: server-generated fields not to send (`id`, `contentVersion`, `createdAt`), and for public note reads, that unpublished notes return 404

## Auth Format

`Authorization: Bearer <token>`

## Base URLs

* Testing (VPS, plain HTTP): `http://<VPS_IP>:8094`. Do not write the real IP into the docs; use the placeholder.
* Local: `http://localhost:8094` with Docker Compose, or `http://localhost:8081` running the backend directly.
* Production: domain not chosen yet (phase 6, HTTPS). Do not invent one.

## Guardrails

* Do not document endpoints that are not implemented. Planned ones stay in `docs/PLAN.md`.
* Every JSON example must match a real DTO field in the code being changed. If you cannot verify a field, say so.
* The sermon note `blocks` shape follows `docs/PLAN.md` §4 and ADR 0002; document it once and link to it from each note endpoint.
* When error behavior changes (new validation, role check, rate limit), update that endpoint's error list too.
* Never put real tokens, emails, codes, or passwords in examples; use obvious placeholders.
* Keep the existing `docs/API.md` style once it exists rather than inventing a new format.

## Beyond hand-written docs (raise when relevant, don't build unasked)

* **Now:** every change to a controller or DTO updates `docs/API.md` in the same diff; [[lighthouse-testing-review]] flags changes that don't.
* **Next, propose:** `springdoc-openapi-starter-webmvc-ui` to generate an OpenAPI spec from the controllers, and import a Postman collection from it. This also allows generating TypeScript types shared by the dashboard and mobile app.
* **Later:** a CI contract check against the generated spec. This is a build/tooling decision for the user, not part of an unrelated endpoint change.
