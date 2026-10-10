# PRODX POS Owner Console Authentication

The owner console is isolated from the existing cashier/terminal authentication.

## Browser environment

Set these Owner Console-specific values in local `.env.local` and Vercel. They intentionally remain separate from the shared `VITE_SUPABASE_*` values used by existing application modules:

```dotenv
VITE_OWNER_SUPABASE_URL=https://bbxoywnlayduqbrjeixj.supabase.co
VITE_OWNER_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_project_key
```

Use the project's publishable key only. Never use a Supabase `service_role` or secret key in a `VITE_*` variable. The repository ignores `.env*` except `.env.example`.

## Enable the owner account

1. In Supabase Dashboard → Authentication → Users, create/invite the intended owner account. Disable public sign-ups if this app should be invite-only.
2. After confirming the user identity, run this statement in the SQL Editor, replacing the UUID with that exact Auth user's ID:

```sql
insert into public.user_roles (user_id, role)
values ('REPLACE_WITH_AUTH_USER_UUID', 'owner')
on conflict (user_id) do update
set role = excluded.role, updated_at = now();
```

Only a trusted project administrator should assign this role. Do not grant owner/admin roles from client-side sign-up, user metadata, URL parameters, or browser storage.

## Protected route

- `/owner` and all `/owner/*` paths are routed to the isolated Owner Console.
- Supabase Auth verifies the signed-in user, then the app reads that user's `public.user_roles` row.
- Only database roles `owner` and `admin` enter the protected console; other signed-in users are denied.
- The existing POS staff login flow and terminal/store verification remain unchanged.
- The client-side route and role gate protect the UI only. They are not server-side authorization for privileged business operations.

## Redirect and deployment

- Set the production site URL in Supabase Authentication → URL Configuration.
- If adding OAuth later, add exact callback URLs for each environment and enable the provider in Supabase first.
- Configure `VITE_OWNER_SUPABASE_URL` and `VITE_OWNER_SUPABASE_PUBLISHABLE_KEY` in Vercel and redeploy the Preview/Production build after verification.
- Test `/owner` in a private window, with an authorized owner account, a regular user without an owner role, and a signed-out browser.

## Free Plan security limitation: leaked-password protection

The current Supabase Security Advisor reports `auth_leaked_password_protection` as disabled. Supabase documents built-in leaked-password protection as a Pro Plan (or higher) feature. The project is intentionally staying on the Free Plan; do not upgrade solely to clear this warning.

On Free Plan, Supabase Auth does not provide its built-in check against the HaveIBeenPwned.org Pwned Passwords dataset. Password strength/length rules, Auth rate limits, CAPTCHA/bot protection, and MFA where available are useful defense-in-depth, but they are **not equivalent** to breached-password detection. Record this as an accepted plan limitation, not as a passed security check. Do not build a custom breach checker in browser code or log/store raw passwords.

## Production authorization boundary

The inspected production backend (`server/entrypoint.ts`) currently uses the existing PRODX bearer-session authentication and PostgreSQL authorization. It does not verify Supabase access tokens as part of this Owner Console change. Do not pass a Supabase session token to the PRODX backend and assume it is trusted, and do not add privileged admin operations based only on a client-side role check.

Before implementing privileged Owner Control Plane APIs, design and test a server-side trust boundary that:
- validates Supabase access tokens using a trusted server-side verification path;
- obtains the current owner/admin role from a trusted source, rather than accepting a client-supplied role or unverified decoded JWT;
- enforces organization/store scope and authorization independently on every protected route; and
- preserves the existing POS auth flow unless a separate migration is designed and reviewed.

The existing `public.user_roles` self-read RLS policy is intended to let users read only their own role row. Keep role provisioning limited to trusted administrative/database workflows and review Data API grants/RLS before exposing additional tables.

## Release checklist

- [ ] Verify authorized owner access and denial for manager/cashier/role-less users.
- [ ] Verify signed-out behavior, session restoration after refresh, and sign-out/session invalidation with repeatable browser tests.
- [ ] Investigate any intermittent generic login error with safe diagnostic evidence.
- [ ] Confirm deployment environment variables without committing secret values.
- [ ] Verify Auth rate limits, available password-strength settings, and CAPTCHA/bot protection where supported.
- [ ] Record leaked-password protection as unavailable on Free Plan; do not mark the security check passed.
- [ ] Before privileged admin APIs, test server-side token validation, trusted role lookup, tenant scoping, and route authorization.
- [ ] Run lint, typecheck, tests, architecture/security/database gates, and CI on the exact release commit.
- [ ] Do not call this console Production Ready until the management modules are implemented and wired, applicable gates pass, and production deployment/runtime configuration is verified.
