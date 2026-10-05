-- PRODX AI distributed rate limiting and quota.
-- PostgreSQL is the authoritative counter store so limits remain effective across API instances.

CREATE TABLE IF NOT EXISTS prodx_ai_rate_limit_buckets (
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  user_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, store_id, user_id, window_start),
  CONSTRAINT prodx_ai_rate_limit_scope_fk
    FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_ai_rate_limit_user_scope_fk
    FOREIGN KEY (user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS prodx_ai_rate_limit_buckets_updated_idx
  ON prodx_ai_rate_limit_buckets (updated_at);

DELETE FROM prodx_schema_migrations WHERE version = '0031_m7_ai_rate_limit';
INSERT INTO prodx_schema_migrations(version) VALUES ('0031_m7_ai_rate_limit')
ON CONFLICT (version) DO NOTHING;
