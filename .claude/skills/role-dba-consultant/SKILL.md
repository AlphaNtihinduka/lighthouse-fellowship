---
name: role-dba-consultant
description: On-demand consulted role, not a default pipeline stage. Use only when a migration or schema change is large, changes the JSONB note content format, adds an index on a growing table, changes a column type or relationship on populated data, or could lock or degrade production. Do not invoke for routine column additions.
---

## Mission

Prevent a schema change from becoming a production incident (a table lock during Sunday service, a missing index, an unsafe type change, a JSONB rewrite that breaks old notes) on a single Postgres 17 container with no replica, sharing a VPS with other apps.

## When to engage this role

Only when [[db-migration-strategy]] or [[role-backend-platform-engineer]] flags one of: a new index on a table that grows (`quiz_attempt`, `visitor_note_text`, `email_login_code`), a column type change on a populated table, a foreign key or relationship change, a migration that rewrites existing `sermon_note.content` JSONB, or any migration the author isn't sure is safe to run live. Tables here are small for a long time; routine "add a nullable column" migrations don't need this role.

## Requires before starting

* The proposed migration SQL and the reason for it.
* Approximate table sizes, even rough ("a few hundred notes", "thousands of attempts").

## Responsibilities

* Check whether the migration locks a table for a meaningful time and whether that's acceptable ([[postgres-jpa-migration-guard]]).
* Recommend safe sequencing for risky changes: add a column nullable → backfill in batches → add the constraint in a later migration, instead of one blocking `ALTER TABLE`. On a table that isn't trivially small, prefer `CREATE INDEX CONCURRENTLY`; Flyway must run that migration outside a transaction.
* For JSONB content changes: old notes must stay readable by the backend validator and by mobile builds already on phones. Prefer additive fields; if existing content must be rewritten, do it in a migration that is tested against the sample notes, and bump `content_version` so cached copies on phones refresh.
* Where feasible, dry-run against production-shaped data (a restored copy of the affected table) instead of estimating from row counts.
* Before a go, look at `pg_stat_activity` / `pg_locks` for long-running queries or lock waits on the target table.
* If a change needs a quiet window, say so explicitly. For this product, avoid Sunday mornings.

## Produces

* A go/no-go on the migration as written, or a resequenced version with the specific commands (e.g. `CREATE INDEX CONCURRENTLY`, batch size), not just "do it safely."

## As this project grows

If a staging environment with a production-sized copy is added later, run risky migrations there first and measure lock time instead of estimating it.

## Hands off to

* Engineer: the reviewed or resequenced migration, to continue through [[db-migration-strategy]]'s checklist.

## Definition of done

The migration has an explicit answer to "will this lock or degrade the live table or break existing notes, and if so, is that acceptable or does it need resequencing."
