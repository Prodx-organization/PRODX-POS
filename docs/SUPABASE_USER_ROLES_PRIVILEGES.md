# Supabase Owner Auth privilege verification

## Migration

`supabase/migrations/20261010140550_harden_user_roles_grants.sql` tightens grants on the existing `public.user_roles` table only. It does not create, alter, or drop tables, columns, constraints, or policies.

- `anon`: no direct table privileges.
- `authenticated`: SELECT only; the existing RLS policy limits rows to `auth.uid() = user_id`.
- `service_role` and table owner privileges are unchanged.

Role assignment must remain an explicitly trusted administrative/database operation. Do not grant INSERT/UPDATE to browser users merely to make role provisioning convenient.

## Verification evidence

After applying the migration to project `bbxoywnlayduqbrjeixj`, live catalog queries confirmed:

- RLS remains enabled on `public.user_roles`.
- The only user-facing policy is SELECT for authenticated with `auth.uid() = user_id`.
- `anon` has no direct table privileges.
- `authenticated` has SELECT only; effective INSERT, UPDATE and DELETE checks return false.
- Supabase migration history records version `20261010140550`, name `harden_user_roles_grants`.

Supabase Security Advisor still reports `auth_leaked_password_protection` disabled. This is a remaining warning, not a passed check.

## Remaining runtime tests

Catalog verification is not a substitute for JWT-backed integration tests. Add/run tests with real test users/tokens to verify a user can read their own role but cannot read another user's role, insert a role, change their role to owner, or delete a role. Do not use production user credentials in tests.

This migration does not alter the production POS PostgreSQL schema under `db/migrations/`; it applies only to the Supabase project's `public.user_roles` table.
