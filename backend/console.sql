BEGIN;

-- ================================
-- Extensions
-- ================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================
-- Types (robust creation)
-- ================================
DO
$$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
            CREATE TYPE user_role_enum AS ENUM ('admin','regular');
        END IF;
    END
$$;

-- ================================
-- Core tables
-- ================================
CREATE TABLE organization
(
    id         uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_profile
(
    id              uuid PRIMARY KEY        DEFAULT gen_random_uuid(),
    organization_id uuid           NOT NULL REFERENCES organization (id) ON DELETE RESTRICT,
    email           text           NOT NULL,
    password_hash   text           NOT NULL,
    display_name    text           NOT NULL,
    role            user_role_enum NOT NULL DEFAULT 'regular',
    is_active       boolean        NOT NULL DEFAULT true,
    is_email_opt_in boolean        NOT NULL DEFAULT false,
    created_at      timestamptz    NOT NULL DEFAULT now(),
    last_login_at   timestamptz    NULL     DEFAULT NULL
);
CREATE INDEX idx_user_profile_org ON user_profile (organization_id);

CREATE TABLE session
(
    id         uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES user_profile (id) ON DELETE CASCADE,
    ip_address text,
    user_agent text,
    state      text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_session_user_time ON session (user_id, created_at);

CREATE TABLE conversation
(
    id           uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL REFERENCES user_profile (id) ON DELETE CASCADE,
    session_id   uuid        NOT NULL REFERENCES session (id) ON DELETE CASCADE,
    title        text,
    status       text        NOT NULL DEFAULT 'active', -- active/deleted
    storage_size bigint      NOT NULL DEFAULT 0 CHECK (storage_size >= 0),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_conv_user_time ON conversation (user_id, created_at);

CREATE TABLE message
(
    id              uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    conversation_id uuid        NOT NULL REFERENCES conversation (id) ON DELETE CASCADE,
    session_id      uuid        NOT NULL REFERENCES session (id) ON DELETE CASCADE,
    role            text        NOT NULL, -- user/assistant/system/tool
    content_md      text        NOT NULL,
    size_bytes      bigint      NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
    meta            jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_msg_conv_time ON message (conversation_id, created_at);

CREATE TABLE document
(
    id                   uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    filename             text        NOT NULL,
    mime_type            text        NOT NULL,
    size_bytes           bigint      NOT NULL CHECK (size_bytes >= 0),
    storage_url          text        NOT NULL,
    processed_text       text,
    processed_text_bytes bigint CHECK (processed_text_bytes IS NULL OR processed_text_bytes >= 0),
    sha256               text,
    status               text        NOT NULL DEFAULT 'uploaded', -- uploaded/processing/ready/archived_quota
    created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_time ON document (created_at);

CREATE TABLE user_document
(
    user_id     uuid        NOT NULL REFERENCES user_profile (id) ON DELETE CASCADE,
    document_id uuid        NOT NULL REFERENCES document (id) ON DELETE CASCADE,
    permission  text        NOT NULL DEFAULT 'owner',
    linked_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, document_id)
);

CREATE TABLE conversation_document
(
    conversation_id uuid        NOT NULL REFERENCES conversation (id) ON DELETE CASCADE,
    document_id     uuid        NOT NULL REFERENCES document (id) ON DELETE CASCADE,
    scope           text        NOT NULL DEFAULT 'context',
    linked_at       timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (conversation_id, document_id)
);

CREATE TABLE telemetry_event
(
    id              uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    session_id      uuid        NOT NULL REFERENCES session (id) ON DELETE CASCADE,
    conversation_id uuid        REFERENCES conversation (id) ON DELETE SET NULL,
    message_id      uuid        REFERENCES message (id) ON DELETE SET NULL,
    kind            text        NOT NULL,                     -- e.g. llm.usage/latency
    data            jsonb       NOT NULL DEFAULT '{}'::jsonb, -- prompt_tokens/...
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tel_session_time ON telemetry_event (session_id, created_at);

CREATE TABLE safety_event
(
    id              uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    session_id      uuid        NOT NULL REFERENCES session (id) ON DELETE CASCADE,
    conversation_id uuid        REFERENCES conversation (id) ON DELETE SET NULL,
    message_id      uuid        REFERENCES message (id) ON DELETE SET NULL,
    category        text        NOT NULL,
    reason          text,
    data            jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE api_call_log
(
    id              uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    session_id      uuid        NOT NULL REFERENCES session (id) ON DELETE CASCADE,
    conversation_id uuid        REFERENCES conversation (id) ON DELETE SET NULL,
    message_id      uuid        REFERENCES message (id) ON DELETE SET NULL,
    provider        text        NOT NULL,
    endpoint        text        NOT NULL,
    http_status     int         NOT NULL,
    request_meta    jsonb       NOT NULL DEFAULT '{}'::jsonb,
    response_meta   jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_storage_quota
(
    user_id     uuid PRIMARY KEY REFERENCES user_profile (id) ON DELETE CASCADE,
    limit_bytes bigint      NOT NULL CHECK (limit_bytes >= 0),
    used_bytes  bigint      NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ================================
-- Password reset codes
-- ================================
CREATE TABLE password_reset_code
(
    id            uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL REFERENCES user_profile (id) ON DELETE CASCADE,
    code_hash     text        NOT NULL,
    sent_to_email text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    expires_at    timestamptz NOT NULL,
    consumed_at   timestamptz NULL,
    attempts      int         NOT NULL DEFAULT 0,
    CONSTRAINT chk_prc_attempts_nonneg CHECK (attempts >= 0)
);
CREATE INDEX IF NOT EXISTS idx_prc_user_email_time ON password_reset_code (user_id, sent_to_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prc_active ON password_reset_code (user_id, sent_to_email) WHERE consumed_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_prc_user_email_active
    ON password_reset_code (user_id, sent_to_email)
    WHERE consumed_at IS NULL;

-- ================================
-- Views (audit/full)
-- ================================
CREATE OR REPLACE VIEW v_user_conversation_bytes AS
SELECT u.id AS user_id, COALESCE(SUM(c.storage_size), 0) AS conv_bytes
FROM user_profile u
         LEFT JOIN conversation c ON c.user_id = u.id
GROUP BY u.id;

CREATE OR REPLACE VIEW v_user_document_bytes AS
SELECT ud.user_id,
       COALESCE(SUM(d.size_bytes + COALESCE(d.processed_text_bytes, 0)), 0) AS doc_bytes
FROM user_document ud
         JOIN document d ON d.id = ud.document_id
GROUP BY ud.user_id;

CREATE OR REPLACE VIEW v_user_total_bytes AS
SELECT u.id                                                   AS user_id,
       COALESCE(vc.conv_bytes, 0)                             AS conv_bytes,
       COALESCE(vd.doc_bytes, 0)                              AS doc_bytes,
       COALESCE(vc.conv_bytes, 0) + COALESCE(vd.doc_bytes, 0) AS total_bytes
FROM user_profile u
         LEFT JOIN v_user_conversation_bytes vc ON vc.user_id = u.id
         LEFT JOIN v_user_document_bytes vd ON vd.user_id = u.id;

-- ================================
-- Functions: quota / upload / autorelease
-- ================================
-- Soft delete (Default: include_archived=false)
CREATE OR REPLACE FUNCTION fn_user_quota_state(p_user uuid, include_archived boolean DEFAULT false)
    RETURNS TABLE
            (
                user_id          uuid,
                limit_bytes      bigint,
                used_conv_bytes  bigint,
                used_doc_bytes   bigint,
                used_total_bytes bigint,
                used_ratio       numeric
            )
    LANGUAGE sql
AS
$$
WITH conv AS (SELECT COALESCE(SUM(c.storage_size), 0) AS bytes
              FROM conversation c
              WHERE c.user_id = p_user
                AND (include_archived OR c.status <> 'archived_quota')),
     doc AS (SELECT COALESCE(SUM(d.size_bytes + COALESCE(d.processed_text_bytes, 0)), 0) AS bytes
             FROM user_document ud
                      JOIN document d ON d.id = ud.document_id
             WHERE ud.user_id = p_user
               AND (include_archived OR d.status <> 'archived_quota')),
     lim AS (SELECT limit_bytes
             FROM user_storage_quota
             WHERE user_id = p_user)
SELECT p_user,
       COALESCE((SELECT limit_bytes FROM lim), 100 * 1024 * 1024)       AS limit_bytes,
       (SELECT bytes FROM conv)                                         AS used_conv_bytes,
       (SELECT bytes FROM doc)                                          AS used_doc_bytes,
       (SELECT bytes FROM conv) + (SELECT bytes FROM doc)               AS used_total_bytes,
       ((SELECT bytes FROM conv) + (SELECT bytes FROM doc))::numeric
           / COALESCE((SELECT limit_bytes FROM lim), 100 * 1024 * 1024) AS used_ratio
    ;
$$;

CREATE OR REPLACE FUNCTION fn_quota_tag_oldest_20_percent(p_user uuid, include_archived boolean DEFAULT false)
    RETURNS TABLE
            (
                tagged_kind  text,
                tagged_id    uuid,
                tagged_bytes bigint
            )
    LANGUAGE plpgsql
AS
$$
DECLARE
    v_limit  bigint;
    v_conv   bigint;
    v_doc    bigint;
    v_total  bigint;
    v_target bigint;
BEGIN
    SELECT limit_bytes, used_conv_bytes, used_doc_bytes, used_total_bytes
    INTO v_limit, v_conv, v_doc, v_total
    FROM fn_user_quota_state(p_user, include_archived);

    IF v_total = 0 OR v_total < v_limit THEN
        RETURN;
    END IF;

    v_target := CEIL(v_total * 0.2);

    CREATE TEMP TABLE IF NOT EXISTS tmp_to_tag
    (
        kind  text,
        rid   uuid,
        bytes bigint
    ) ON COMMIT DROP;
    TRUNCATE TABLE tmp_to_tag;

    WITH assets AS (SELECT 'conversation'::text        AS kind,
                           c.id                        AS rid,
                           c.created_at,
                           COALESCE(c.storage_size, 0) AS bytes
                    FROM conversation c
                    WHERE c.user_id = p_user
                      AND (include_archived OR c.status <> 'archived_quota')
                    UNION ALL
                    SELECT 'document'::text                                                AS kind,
                           d.id                                                            AS rid,
                           d.created_at,
                           COALESCE(d.size_bytes, 0) + COALESCE(d.processed_text_bytes, 0) AS bytes
                    FROM user_document ud
                             JOIN document d ON d.id = ud.document_id
                    WHERE ud.user_id = p_user
                      AND (include_archived OR d.status <> 'archived_quota')),
         ordered AS (SELECT *, SUM(bytes) OVER (ORDER BY created_at, kind, rid) AS running
                     FROM assets)
    INSERT
    INTO tmp_to_tag(kind, rid, bytes)
    SELECT kind, rid, bytes
    FROM ordered
    WHERE running <= v_target;

    RETURN QUERY
        SELECT kind, rid AS tagged_id, bytes AS tagged_bytes
        FROM tmp_to_tag;

    UPDATE conversation c
    SET status = 'archived_quota'
    FROM (SELECT rid FROM tmp_to_tag WHERE kind = 'conversation') t
    WHERE c.id = t.rid
      AND c.status <> 'archived_quota';

    UPDATE document d
    SET status = 'archived_quota'
    FROM (SELECT rid FROM tmp_to_tag WHERE kind = 'document') t
    WHERE d.id = t.rid
      AND d.status <> 'archived_quota';
END;
$$;

-- Validate before upload (will adding incoming_size exceed quota)
CREATE OR REPLACE FUNCTION fn_can_upload(p_user uuid, incoming_size_bytes bigint)
    RETURNS TABLE
            (
                allowed     boolean,
                limit_bytes bigint,
                would_total bigint,
                deficit     bigint
            )
    LANGUAGE sql
AS
$$
WITH s AS (SELECT *
           FROM fn_user_quota_state(p_user, false))
SELECT (s.used_total_bytes + incoming_size_bytes) <= s.limit_bytes             AS allowed,
       s.limit_bytes,
       (s.used_total_bytes + incoming_size_bytes)                              AS would_total,
       GREATEST((s.used_total_bytes + incoming_size_bytes) - s.limit_bytes, 0) AS deficit
FROM s;
$$;

-- Auto release quota on message (Earliest 20% if over limit)
CREATE OR REPLACE FUNCTION fn_autorelease_on_message(p_user uuid)
    RETURNS TABLE
            (
                tagged_kind  text,
                tagged_id    uuid,
                tagged_bytes bigint
            )
    LANGUAGE plpgsql
AS
$$
DECLARE
    s RECORD;
BEGIN
    SELECT * INTO s FROM fn_user_quota_state(p_user, false);
    IF s.used_total_bytes <= s.limit_bytes THEN
        RETURN;
    END IF;
    RETURN QUERY
        SELECT * FROM fn_quota_tag_oldest_20_percent(p_user, false);
END;
$$;

-- ================================
-- Triggers (fixed/enhanced)
-- ================================
-- Doc processed_text bytes
CREATE OR REPLACE FUNCTION tg_doc_processed_bytes() RETURNS trigger AS
$$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.processed_text_bytes := COALESCE(octet_length(NEW.processed_text), 0);
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.processed_text IS DISTINCT FROM OLD.processed_text THEN
            NEW.processed_text_bytes := COALESCE(octet_length(NEW.processed_text), 0);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_doc_processed_bytes ON document;
CREATE TRIGGER trg_doc_processed_bytes
    BEFORE INSERT OR UPDATE OF processed_text
    ON document
    FOR EACH ROW
EXECUTE FUNCTION tg_doc_processed_bytes();

-- Message size_bytes (auto calculate)
CREATE OR REPLACE FUNCTION tg_msg_compute_size() RETURNS trigger AS
$$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.content_md IS DISTINCT FROM OLD.content_md) THEN
        NEW.size_bytes := COALESCE(octet_length(NEW.content_md), 0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_msg_compute_size ON message;
CREATE TRIGGER trg_msg_compute_size
    BEFORE INSERT OR UPDATE OF content_md
    ON message
    FOR EACH ROW
EXECUTE FUNCTION tg_msg_compute_size();

-- Conversation storage_size sync
CREATE OR REPLACE FUNCTION tg_conv_bytes_from_message() RETURNS trigger AS
$$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE conversation
        SET storage_size = storage_size + NEW.size_bytes
        WHERE id = NEW.conversation_id;

    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.conversation_id <> OLD.conversation_id THEN
            UPDATE conversation
            SET storage_size = storage_size - OLD.size_bytes
            WHERE id = OLD.conversation_id;
            UPDATE conversation
            SET storage_size = storage_size + NEW.size_bytes
            WHERE id = NEW.conversation_id;
        ELSE
            UPDATE conversation
            SET storage_size = storage_size + (NEW.size_bytes - OLD.size_bytes)
            WHERE id = NEW.conversation_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversation
        SET storage_size = storage_size - OLD.size_bytes
        WHERE id = OLD.conversation_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_msg_conv_bytes ON message;
CREATE TRIGGER trg_msg_conv_bytes
    AFTER INSERT OR UPDATE OF size_bytes, conversation_id OR DELETE
    ON message
    FOR EACH ROW
EXECUTE FUNCTION tg_conv_bytes_from_message();

-- New user default quota（100MB）
CREATE OR REPLACE FUNCTION tg_user_default_quota() RETURNS trigger AS
$$
BEGIN
    INSERT INTO user_storage_quota(user_id, limit_bytes, used_bytes)
    VALUES (NEW.id, 100 * 1024 * 1024, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_default_quota ON user_profile;
CREATE TRIGGER trg_user_default_quota
    AFTER INSERT
    ON user_profile
    FOR EACH ROW
EXECUTE FUNCTION tg_user_default_quota();

COMMIT;

CREATE OR REPLACE FUNCTION fn_autorelease_on_message(p_user uuid)
    RETURNS TABLE
            (
                tagged_kind  text,
                tagged_id    uuid,
                tagged_bytes bigint
            )
    LANGUAGE plpgsql
AS
$$
DECLARE
    s RECORD;
BEGIN
    -- User-level lightweight lock: Serializing concurrent release for the same user
    PERFORM pg_advisory_xact_lock(hashtext('quota:' || p_user::text));

    SELECT * INTO s FROM fn_user_quota_state(p_user, false);
    IF s.used_total_bytes <= s.limit_bytes THEN
        RETURN;
    END IF;

    RETURN QUERY
        SELECT * FROM fn_quota_tag_oldest_20_percent(p_user, false);
END;
$$;
