# PRODX POS Owner Console Authentication

The owner console is isolated from the existing cashier/terminal authentication.

## Browser environment

Set these values in local `.env.local` and the production deployment environment:

```dotenv
VITE_SUPABASE_URL=https://bbxoywnlayduqbrjeixj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_project_key
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

## Redirect and deployment

- Set the production site URL in Supabase Authentication → URL Configuration.
- If adding OAuth later, add exact callback URLs for each environment and enable the provider in Supabase first.
- Configure the same browser-safe environment variables in the Vercel project and redeploy.
- Test `/owner` in a private window, with an authorized owner account, a regular user without an owner role, and a signed-out browser.
