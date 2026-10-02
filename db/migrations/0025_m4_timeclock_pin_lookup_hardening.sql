-- PRODX POS M4.1.1 timeclock PIN lookup hardening
-- Deterministic lookup is HMAC-based so the server can locate the credential
-- without storing plaintext/reversible PIN material.

ALTER TABLE prodx_timeclock_credentials
  ADD COLUMN IF NOT EXISTS pin_lookup_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS prodx_timeclock_credentials_lookup_unique
  ON prodx_timeclock_credentials(organization_id, store_id, pin_lookup_hash);

INSERT INTO prodx_schema_migrations(version)
VALUES ('0025_m4_timeclock_pin_lookup_hardening')
ON CONFLICT(version) DO NOTHING;
