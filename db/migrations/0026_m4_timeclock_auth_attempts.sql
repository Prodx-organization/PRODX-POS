-- PRODX POS M4.1.2 timeclock authentication attempt throttling
-- Failed PIN attempts that cannot yet be attributed to a credential are
-- scoped to the authenticated operator and store. This is separate from
-- per-credential lockout state.

CREATE TABLE IF NOT EXISTS prodx_timeclock_auth_attempts (
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  actor_user_id UUID NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, store_id, actor_user_id),
  CONSTRAINT prodx_timeclock_auth_attempts_store_org_fk
    FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_timeclock_auth_attempts_actor_org_fk
    FOREIGN KEY (actor_user_id, organization_id)
    REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_timeclock_auth_attempts_failed_valid
    CHECK (failed_attempts >= 0)
);

INSERT INTO prodx_schema_migrations(version)
VALUES ('0026_m4_timeclock_auth_attempts')
ON CONFLICT(version) DO NOTHING;
