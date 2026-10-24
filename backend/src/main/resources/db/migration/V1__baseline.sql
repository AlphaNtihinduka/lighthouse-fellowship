-- Phase 1 baseline: admin accounts and sermon notes (docs/PLAN.md §5).
-- Visitor tables (visitor, email_login_code, quiz_attempt, visitor_note_text,
-- visitor_deletion_request) arrive in phase 5 with the code that uses them.

CREATE TABLE admin_user (
    id             UUID         PRIMARY KEY,
    -- Stored lowercased and trimmed by the application, so a plain unique
    -- constraint is enough to keep one account per address.
    email          VARCHAR(254) NOT NULL,
    password_hash  VARCHAR(100) NOT NULL,
    display_name   VARCHAR(120) NOT NULL,
    role           VARCHAR(20)  NOT NULL,
    -- Embedded in every admin JWT as the "tv" claim; incremented on password
    -- change so tokens issued before it stop working.
    token_version  INTEGER      NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uk_admin_user_email UNIQUE (email),
    CONSTRAINT ck_admin_user_role CHECK (role IN ('ADMIN'))
);

CREATE TABLE sermon_note (
    id                     UUID         PRIMARY KEY,
    title                  VARCHAR(200) NOT NULL,
    preacher_name          VARCHAR(120) NOT NULL,
    -- One note per Sunday. The Sunday rule itself is checked in the service.
    sermon_date            DATE         NOT NULL,
    cover_image_url        VARCHAR(500),
    cover_image_public_id  VARCHAR(255),
    -- Ordered list of blocks, validated in NoteContentValidator on every write
    -- (ADR 0002). The database only guarantees it is a JSON array.
    content                JSONB        NOT NULL DEFAULT '[]'::jsonb,
    content_version        INTEGER      NOT NULL DEFAULT 1,
    -- NULL = draft, future = scheduled, past = published. Public reads filter
    -- on this column in the query itself.
    publish_at             TIMESTAMPTZ,
    -- Kept when the admin account is removed; the note belongs to the church.
    created_by             UUID         REFERENCES admin_user (id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ  NOT NULL,
    updated_at             TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uk_sermon_note_sermon_date UNIQUE (sermon_date),
    CONSTRAINT ck_sermon_note_content_is_array CHECK (jsonb_typeof(content) = 'array'),
    CONSTRAINT ck_sermon_note_content_version CHECK (content_version >= 1)
);

-- Public reads: "published notes by sermon date" (list by year, latest).
-- The unique constraint above already indexes sermon_date for admin reads.
CREATE INDEX idx_sermon_note_published_sermon_date
    ON sermon_note (sermon_date DESC)
    WHERE publish_at IS NOT NULL;
