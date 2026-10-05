-- PRODX POS audit log immutability
-- Business-critical audit history is append-only. UPDATE/DELETE must fail at the database boundary.

CREATE OR REPLACE FUNCTION prodx_prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'prodx_audit_log is append-only; UPDATE and DELETE are not permitted';
END;
$$;

DROP TRIGGER IF EXISTS prodx_audit_log_immutable_guard ON prodx_audit_log;
CREATE TRIGGER prodx_audit_log_immutable_guard
BEFORE UPDATE OR DELETE ON prodx_audit_log
FOR EACH ROW
EXECUTE FUNCTION prodx_prevent_audit_log_mutation();

INSERT INTO prodx_schema_migrations(version)
VALUES ('0030_m5_audit_log_immutability')
ON CONFLICT(version) DO NOTHING;
