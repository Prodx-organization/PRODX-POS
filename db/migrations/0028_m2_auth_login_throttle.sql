-- PRODX POS M2 authentication network-level login throttling.
-- Stores only a SHA-256 fingerprint of the observed client IP; raw IPs are never persisted.

CREATE TABLE IF NOT EXISTS prodx_auth_login_throttles (
  client_fingerprint TEXT PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_auth_login_throttles_failed_valid CHECK (failed_attempts >= 0)
);

CREATE INDEX IF NOT EXISTS prodx_auth_login_throttles_locked_idx
  ON prodx_auth_login_throttles (locked_until);

INSERT INTO prodx_schema_migrations(version)
VALUES ('0028_m2_auth_login_throttle')
ON CONFLICT(version) DO NOTHING;
