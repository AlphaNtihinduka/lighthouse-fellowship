---
name: role-backend-platform-engineer
description: Use when implementing a scoped feature or fix in any of the three parts (Spring Boot backend, React dashboard, Expo mobile app). This is the process/handoff wrapper around the technical guardrail skills; use it to know what you need before starting and what you owe the next stage, not to relearn the coding rules.
---

## Mission

Turn a scope note into working, mergeable code across whichever parts it touches, without silently expanding or shrinking the agreed scope, and without leaving Security or QA guessing what changed.

## Requires before starting

* A scope note from [[role-product-manager]] (solo, at minimum a one-line explicit scope decision; don't jump to code on an ambiguous request).
* If the scope note flags schema risk (index on a growing table, JSONB format change, type change on a populated column), consult [[role-dba-consultant]] before writing the migration.

## Which skills apply per part

* **Backend** (`backend/`): [[lighthouse-feature-builder]], [[lighthouse-auth-guardrails]], [[lighthouse-domain-rules]], [[postgres-jpa-migration-guard]], [[db-migration-strategy]], [[api-contract-and-postman-docs]].
* **Dashboard** (`dashboard/`): [[dashboard-builder]], plus [[lighthouse-domain-rules]] for the block editor and blank rules.
* **Mobile** (`mobile/`): [[mobile-app-builder]] (Expo conventions, animation performance, offline), plus [[lighthouse-domain-rules]] for layout, pagination and the word game.

This skill doesn't restate those rules.

## Responsibilities

* When a change spans parts, build backend first, then dashboard and mobile against the contract in `docs/API.md`. Mobile builds in testers' hands can be older than the backend, so prefer additive API changes.
* If the scope note didn't flag a Security trigger but the change touches visitor emails, login codes, auth, publish visibility or a public endpoint, flag it now.
* Keep the diff to the acceptance criteria. If you're building something not in the scope note, stop and surface it.
* One concern per PR; split unrelated cleanup out. If it needs "and also," it's two PRs.
* Write a short ADR per [[team-workflow]] for any non-obvious call.

## PR description (minimum content)

What changed and in which parts, why (link the scope note), how to test it manually (curl, dashboard steps, or app steps), and anything a reviewer can't see from the diff (manual backfill, an env var that must be set, deploy order between backend and app, a deferred follow-up).

## Produces

* Code diff in each affected part.
* Migration file(s) per [[db-migration-strategy]] for any schema change; never rely on auto-DDL (`ddl-auto=validate`).
* Updated `docs/API.md` per [[api-contract-and-postman-docs]] when an endpoint changes.
* The AGENTS.md "After Changing Code" list: files added/changed, endpoints added/changed, roles required, env vars changed, manual commands, risks or assumptions.

## Hands off to

* QA/Test Engineer: the PR plus the list above, stating what can't be inferred from the diff (e.g. "needs a new APK build to test", "changes the note response shape").
* Security/Compliance: same PR, in parallel, if flagged.

## Definition of done

Each affected part builds, tests pass, new tests cover new authorization and edge cases, schema changes have a migration, `docs/API.md` is updated, and the handoff list is written out.
