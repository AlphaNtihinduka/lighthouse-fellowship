# ADR-0002: Store sermon note content as validated JSONB blocks

Date: 2026-10-24
Status: Accepted

## Context

A sermon note is an ordered list of blocks (HEADING, SCRIPTURE, PARAGRAPH, LIST, REFLECTION). Paragraph-like blocks contain segments that are either text or a blank with a 1–3 word answer. The four sample notes already needed two block types that weren't in the first draft (numbered lists and reflection prompts), so the format will keep growing. Notes are always read and saved whole: the app downloads a whole note, the dashboard saves a whole note.

## Decision

Store `blocks` as a single `content` JSONB column on `sermon_note`, mapped with `@JdbcTypeCode(SqlTypes.JSON)`. The service layer validates it strictly on every write (known block types only, unique stable block and blank IDs, answers of 1–3 words, no empty segments) and rejects unknown fields. `content_version` is bumped on every content change so clients know when to refresh their offline copy.

The format grows by adding a block type to the validator, the dashboard editor and the mobile renderer in the same change. Mobile renderers must skip unknown block types instead of crashing, because installed apps can't be force-updated.

## Alternatives considered

* **Normalized tables (`note_block`, `block_segment`, `blank`).** Rejected: every save becomes a delete-and-reinsert of dozens of rows, every new block type needs a migration, and nothing queries blocks individually.
* **Unvalidated JSON.** Rejected: a malformed note would break the reader on every phone that downloads it.

## Consequences

* No migration is needed for a new block type, but the validator is the only schema; it needs thorough tests.
* Per-blank statistics ("most missed blank") would need to read JSONB or record blank IDs in attempts. Acceptable for a "Later" feature.
* Block and blank IDs must stay stable when a note is edited, so synced attempts and personal notes keep pointing at the right place.
