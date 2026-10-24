---
name: postgres-jpa-migration-guard
description: Use when changing the database, persistence, Docker Compose database configuration, repositories, entities, migrations, or tests in backend/. Prevents MongoDB drift and enforces PostgreSQL 17 + Spring Data JPA + Flyway rules.
---

Use this skill for persistence, database, or infrastructure changes that could affect Postgres or JPA behavior.

## Rules

* The backend uses PostgreSQL 17 and Spring Data JPA only. Do not add MongoDB, `spring-boot-starter-data-mongodb`, `MongoRepository`, `@Document`, `org.springframework.data.mongodb`, or `ObjectId`.
* Use `jakarta.persistence` annotations, `@Entity`/`@Table`, `JpaRepository`, and PostgreSQL column types. Entities live in `com.lighthousefellowship.backend.model`, repositories in `.repository`.
* Docker Compose Postgres service name is `postgres`; the container JDBC URL is `jdbc:postgresql://postgres:5432/${POSTGRES_DB}`, never `localhost` inside the container network.
* Postgres is not published on a VPS host port. Never suggest `docker compose down -v` unless the user explicitly wants to delete all data.
* `.env.example` holds placeholders only; `.env` is never committed.

## Schema changes go through Flyway, not auto-DDL

`spring.jpa.hibernate.ddl-auto=validate`: Hibernate checks the schema against the entities at startup and fails on a mismatch; it never changes the schema. Flyway applies `backend/src/main/resources/db/migration/V*.sql`, starting with `V1__baseline.sql` in phase 1 (tables from `docs/PLAN.md` §5). Any new entity or field change needs a new migration, not just an annotation change. See [[db-migration-strategy]].

`validate` catches missing tables and columns, but not a stale CHECK constraint. If an `@Enumerated(EnumType.STRING)` column (e.g. `admin_user.role`) gains a value, write the migration that recreates its CHECK constraint by hand, or inserts of the new value fail at runtime.

## JSONB content

* `sermon_note.content` is one JSONB column holding the block list (ADR 0002). Map it with Hibernate's JSON support (`@JdbcTypeCode(SqlTypes.JSON)`) to a typed Java structure, not a raw `String`.
* Block validation (types, unique block and blank IDs, 1-3 word answers) lives in the service layer, not the database, and runs on every write path.
* Bump `content_version` whenever `content` changes; the mobile app uses it to refresh its offline cache.
* Decide the delete behavior of `quiz_attempt` and `visitor_note_text` foreign keys (cascade or block) explicitly in the migration.

## More rules

* Keep the Hikari pool small and sized for the Compose memory limits; the VPS is shared ([[docker-vps-deployment]]).
* Integration tests use Testcontainers PostgreSQL 17 through the real Flyway path, not a `ddl-auto=create` schema that would pass with broken migrations.

## Persistence Checklist

1. Entities use JPA; repositories use `JpaRepository`; no Mongo imports.
2. Compose uses `postgres:17`; `SPRING_DATASOURCE_URL` uses the `postgres` service name; the volume is preserved.
3. Database credentials come from environment variables; no real secrets committed.
4. New or changed columns have a migration ([[db-migration-strategy]]).
5. An enum-backed column change includes a migration recreating its CHECK constraint.
6. JSONB content changes go through the service-layer validator and bump `content_version`.
7. Integration tests use Testcontainers PostgreSQL 17 and the real migrations.
