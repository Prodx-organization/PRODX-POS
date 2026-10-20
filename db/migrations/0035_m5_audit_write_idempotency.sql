-- Durable idempotency for supplemental client-origin audit events.
ALTER TABLE public.prodx_audit_log
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS payload_hash TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'prodx_audit_idempotency_key_valid'
       AND conrelid = 'public.prodx_audit_log'::regclass
  ) THEN
    ALTER TABLE public.prodx_audit_log
      ADD CONSTRAINT prodx_audit_idempotency_key_valid
      CHECK (
        idempotency_key IS NULL OR
        (length(btrim(idempotency_key)) BETWEEN 1 AND 128 AND payload_hash IS NOT NULL AND payload_hash ~ '^[0-9a-f]{64}$')
      );
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS prodx_audit_idempotency_scope_unique
  ON public.prodx_audit_log (organization_id, store_id, user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

INSERT INTO public.prodx_schema_migrations(version)
VALUES ('0035_m5_audit_write_idempotency')
ON CONFLICT (version) DO NOTHING;
