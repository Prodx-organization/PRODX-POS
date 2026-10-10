-- Restrict browser-facing privileges on the Owner Console role lookup table.
-- RLS remains the row-level boundary; table grants are a separate gate.
REVOKE ALL PRIVILEGES ON TABLE public.user_roles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.user_roles FROM authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
