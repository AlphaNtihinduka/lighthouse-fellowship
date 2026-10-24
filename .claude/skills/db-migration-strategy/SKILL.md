---
name: db-migration-strategy
description: Use whenever an entity is added or changed, or any schema-affecting persistence change is made in backend/. Enforces versioned, reviewable Flyway migrations instead of Hibernate ddl-auto.
---

## Status

Nothing is built yet (phase 0). In phase 1 the backend starts with `flyway-core` + `flyway-database-postgresql`, `V1__baseline.sql` creating the six tables in `docs/PLAN.md` §5 (`admin_user`, `sermon_note`, `visitor`, `email_login_code`, `quiz_attempt`, `visitor_note_text`), and `ddl-auto=validate` from day one. There is no existing data, so no `baseline-on-migrate` is needed.

**Check that Flyway really runs.** Spring Boot 4 split autoconfiguration into separate modules, and on SponsorDirect `spring.flyway.*` properties turned out to be inert because no Flyway autoconfiguration was on the classpath; it had to be wired by hand (a config class that runs `Flyway.migrate()` before the `DataSource` is handed to Hibernate). In phase 1, confirm from the startup log that Flyway applied `V1` on a fresh database. If it did not, add the Boot Flyway module/starter if one exists for the version in use, otherwise wire it manually.

## Expand/contract for breaking-shaped changes

A rename, type change, or removal is a sequence, so old and new code can run against the schema during a deploy:

1. **Expand**: add the new column or table alongside the old one (nullable or with a default).
2. **Migrate**: backfill; ship code that writes both, or reads new and falls back to old, for at least one deploy.
3. **Contract**: once nothing reads the old shape, drop it in a later migration, with user confirmation.

Never collapse expand and contract into one migration. Adding an enum value is expand-only (recreate the CHECK constraint with the new value); removing one is a contract step.

**The mobile app is a slow consumer.** Once it is in the stores, old app versions keep calling the API for months. A column that feeds an API field cannot be contracted until the field is gone from the API, which per [[api-contract-and-postman-docs]] is effectively never for a shipped field.

## JSONB content changes

`sermon_note.content` (ADR 0002) lets the block format grow without a SQL migration: a new block type or field is a validator + DTO change. But:

* Old notes stay in the old shape. New fields are optional with a default, or old rows are backfilled by a versioned migration (`UPDATE ... SET content = jsonb_set(...)`), and the validator accepts both until the backfill is done.
* An older mobile app must not crash on an unknown block type; see [[mobile-app-builder]].
* Changing existing note content bumps `content_version`.

## Rules

* Every new entity or field change ships with `backend/src/main/resources/db/migration/V<n>__description.sql` in the same change.
* Never edit an applied migration, including `V1__baseline.sql`; add a new one. Before the first VPS deploy of phase 1, `V1` may still be edited if no database anywhere has applied it; after that, never.
* Migrations are additive and backward-compatible where possible (nullable column, backfill, then NOT NULL in a later migration).
* No migration drops a column or table without the user confirming the data is safe to lose.
* An enum change and its CHECK-constraint migration land in the same change.
* Use repeatable migrations (`R__description.sql`) only for things rerun whole on change (views, functions). The admin account is created by the seeder from env vars ([[secrets-and-config-management]]), not by a migration.
* Keep SQL PostgreSQL-17-specific, consistent with [[postgres-jpa-migration-guard]].
* Until automated, tested backups exist ([[docker-vps-deployment]]), take a manual `pg_dump` before any migration that alters or drops existing structure.

## Checklist

1. Does this change add, modify, or remove a column, table, index, or constraint?
2. Is there a new versioned migration for it?
3. Is it additive, or does a rename/type change/removal follow expand/migrate/contract?
4. Are applied migration files untouched?
5. Does an enum change include the CHECK-constraint migration?
6. For a JSONB format change: are old notes still valid, and can an older app still read them?
7. Report: migrations added, any manual backfill, whether a backup was taken, and the `ddl-auto` mode.
