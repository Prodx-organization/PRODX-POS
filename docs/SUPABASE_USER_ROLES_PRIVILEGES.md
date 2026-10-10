# Supabase Owner Auth privilege verification

## Migration

`supabase/migrations/20261010070000_harden_user_roles_grants.sql` tightens grants on the existing `public.user_roles` table only. It does not create, alter, or drop tables, columns, constraints, or policies.

- `anon`: no direct table privileges.
- `authenticated`: SELECT only; the existing RLS policy limits rows to `auth.uid() = user_id`.
- `service_role` and table owner privileges are unchanged.

Role assignment must remain an explicitly trusted administrative/database operation. Do not grant INSERT/UPDATE to browser users merely to make role provisioning convenient.

## Required verification after applying

1. Confirm RLS is enabled on `public.user_roles`.
2. Confirm the only user-facing policy is SELECT to authenticated with `auth.uid() = user_id`.
3. Confirm `anon` has no table privileges and `authenticated` has SELECT but not INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER.
4. Run Supabase Security Advisor and record remaining warnings separately.
5. In an authenticated browser integration test, verify a user can read their own role and cannot read another user's role, insert a role, change their role to owner, or delete a role. SQL catalog checks alone do not replace these JWT-backed tests.

This migration intentionally does not alter the production POS PostgreSQL schema under `db/migrations/`; it applies only to the Supabase project's `public.user_roles` table.
