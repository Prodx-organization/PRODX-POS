-- Harden security-sensitive public functions against role-mutable search_path.
-- Explicitly qualify the trusted schemas used by trigger/RBAC functions.
ALTER FUNCTION public.prodx_enforce_refund_balance() SET search_path = public, pg_catalog;
ALTER FUNCTION public.prodx_enforce_refund_immutable() SET search_path = public, pg_catalog;
ALTER FUNCTION public.prodx_enforce_refund_item_allocation() SET search_path = public, pg_catalog;
ALTER FUNCTION public.prodx_enforce_refund_item_integrity() SET search_path = public, pg_catalog;
ALTER FUNCTION public.prodx_enforce_void_immutable() SET search_path = public, pg_catalog;
ALTER FUNCTION public.prodx_prevent_audit_log_mutation() SET search_path = public, pg_catalog;
ALTER FUNCTION public.prodx_provision_ai_use_for_role() SET search_path = public, pg_catalog;
ALTER FUNCTION public.prodx_validate_order_financial_invariants() SET search_path = public, pg_catalog;
ALTER FUNCTION public.prodx_validate_payment_currency() SET search_path = public, pg_catalog;
ALTER FUNCTION public.prodx_validate_refund_commit() SET search_path = public, pg_catalog;
ALTER FUNCTION public.prodx_validate_refund_item_effect() SET search_path = public, pg_catalog;
