---
name: lighthouse-feature-builder
description: Use when implementing a new Lighthouse Fellowship backend feature or extending an existing one (sermon notes, publish scheduling, cover images, visitor auth, attempts sync, personal notes, visitor contacts). Ensures the Spring Boot code follows the agreed package layout, Flyway migrations, JSONB content validation, API docs and tests.
---

Use this skill when writing backend code under `backend/`. The layout copies SponsorDirect's; nothing is built yet, so the first feature sets the pattern and later features follow it.

## Package Layout

Root package `com.lighthousefellowship.backend`:

| Package | Holds |
|---|---|
| `config` | `SecurityConfig`, `JwtAuthenticationFilter`, `CorsConfig`, `ClockConfig`, `CloudinaryConfig`, `AdminSeeder`, `RateLimitingFilter`, JSON entry point / access-denied handlers |
| `controller` | `@RestController` classes, thin: validate, take the principal, call the service, return `ResponseEntity` |
| `dto/request` | `...RequestDTO` classes with Jakarta validation |
| `dto/response` | `...ResponseDTO` classes, plus `ApiErrorResponse` (record) |
| `exception` | one specific exception per case (`SermonNoteNotFoundException`, `SermonNoteContentValidationException`, `DuplicateSermonDateException`, `InvalidLoginCodeException`) and `GlobalExceptionHandler` |
| `mapper` | MapStruct `@Mapper(componentModel = "spring")` interfaces |
| `model` | JPA entities |
| `model/enums` | enums such as `AdminRole`, `BlockType`, `TextAlign` |
| `repository` | `JpaRepository` interfaces |
| `service` | service interfaces |
| `service/impl` | `@Service` implementations |
| `service/support` | helpers: `NoteContentValidator`, `LoginCodeHasher`, `EmailMasker`, principals |

Do not add new top-level packages or a different architecture unless asked.

## Code Conventions

* Lombok: entities use `@Entity @Table(name = "...") @AllArgsConstructor @NoArgsConstructor @Data`; DTOs use `@AllArgsConstructor @NoArgsConstructor @Data`; controllers and services use `@AllArgsConstructor` constructor injection with `private final` fields (`@Slf4j` where logging is needed).
* `jakarta.persistence` and `jakarta.validation` only. Enums persisted with `@Enumerated(EnumType.STRING)` and a matching `CHECK` constraint in the migration.
* IDs: UUID for `sermon_note`, `visitor` (per PLAN §5). Pick one representation (`UUID` type) and keep it everywhere.
* Never return an entity from a controller; map to a `...ResponseDTO`. The admin note DTO and the public note DTO are separate classes; the public one has no `createdBy`, `coverImagePublicId` or draft-only fields.
* Throw a specific exception from the service; map it once in `GlobalExceptionHandler` to the right status (404 not found, 409 duplicate, 400 validation, 401/403 auth) with an `ApiErrorResponse` body. No generic `RuntimeException("...")`.
* Put a short comment above a class or a non-obvious block explaining why it exists (for example why the JSONB column is validated in Java, or why a public note query filters on `publish_at`). Skip comments that restate the code.
* Time comes from an injected `Clock`.
* Writes that touch more than one row are `@Transactional`.

## Sermon Note Content (JSONB)

* `sermon_note.content` is `jsonb`, mapped with Hibernate's `@JdbcTypeCode(SqlTypes.JSON)` to a typed Java structure (a `List<Block>` with segment records), not a raw `String`.
* `NoteContentValidator` in `service/support` runs on every create and update, before saving, and throws `SermonNoteContentValidationException` with a message naming the block. It checks:
  * known block type, required fields per type (PLAN §4 table), no unknown fields
  * block IDs unique, blank IDs unique across the note, IDs non-blank and short
  * every segment is exactly one of text or blank
  * blank answer trimmed, 1–3 words, reasonable length
  * `SCRIPTURE` has text and reference; `LIST` has at least one item; `REFLECTION` has a prompt
  * an overall size limit (number of blocks, total characters)
* Bump `content_version` whenever content changes.
* `sermon_date` must be a Sunday; validate in the service and enforce uniqueness with a unique index (map the violation to 409).

## Public Reads

* Repository methods for public reads filter on `publishAt <= :now` in the query itself (`findByIdAndPublishAtLessThanEqual`). Never load by ID and check afterwards.
* A draft or scheduled note on a public path returns 404.
* Answers are included in the public response on purpose (ADR 0003; see [[lighthouse-domain-rules]]).

## Migrations

* Every schema change is a new Flyway file `V<n>__<description>.sql` in `src/main/resources/db/migration`. Never edit an applied migration. `spring.jpa.hibernate.ddl-auto=validate`.
* Postgres 17 only. Indexes for every lookup used by a public or `/api/me` query.
* Follow [[postgres-jpa-migration-guard]] and [[db-migration-strategy]]; ask [[role-dba-consultant]] questions for anything non-trivial (JSONB indexes, constraint changes on populated tables).

## Feature Checklist

1. Confirm the feature is in scope ([[lighthouse-domain-rules]], "Do Not Implement Yet").
2. Read the existing entities, DTOs, repositories, services, controllers, config and exception handler in the area.
3. Write the Flyway migration first, then the entity, repository, DTOs, mapper, service interface + impl, controller.
4. Add bean validation on request DTOs and domain checks in the service (Sunday date, publish rules, content validator).
5. Add the SecurityConfig matcher with the right role and scope `/api/me` queries by the principal's visitor ID ([[lighthouse-auth-guardrails]]).
6. Add specific exceptions and map them in `GlobalExceptionHandler`.
7. Add env vars to `.env.example` and Compose if needed ([[secrets-and-config-management]]); Cloudinary credentials stay server-side only.
8. Write tests per [[lighthouse-testing-review]]: unit tests for services and the validator, MockMvc role matrix, unpublished-note leakage, Testcontainers for repository queries.
9. Update `docs/API.md` with request and response examples ([[api-contract-and-postman-docs]]).
10. Report, as AGENTS.md asks: files added, files changed, endpoints added or changed, roles required, env vars changed, manual commands, risks or assumptions.
