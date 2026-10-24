# ADR-0001: One repository for backend, dashboard and mobile

Date: 2026-10-24
Status: Accepted

## Context

The product has three parts: a Spring Boot API, a React dashboard where admins write sermon notes, and an Expo app where visitors read and play them. All three depend on the same sermon note content format (PLAN §4): a change to a block type touches the backend validator, the dashboard editor and the mobile renderer at the same time. The team is one developer plus AI agents.

## Decision

Keep all three in one repository (`backend/`, `dashboard/`, `mobile/`), each with its own build tool and `package.json`/`pom.xml`. No npm workspaces for now.

## Alternatives considered

* **Three repositories, like SponsorDirect's backend/frontend split.** Rejected: a content-format change would need three coordinated PRs, and skills/ADRs/PROJECT_STATE would be duplicated or drift.
* **npm workspaces with a shared `packages/note-schema`.** Deferred, not rejected: Expo supports monorepos, but workspaces add Metro and hoisting friction before there is any shared code. Revisit when the pagination logic or content types are shared between dashboard and mobile (phase 2/3).

## Consequences

* One PR can change the format end to end; CI builds all three parts.
* CI must use path filters or separate jobs so a dashboard change doesn't wait on a Maven build.
* Until a shared package exists, content types are duplicated in `dashboard/src/api` and `mobile/src/api`, and must be kept in sync with `docs/API.md`.
