# Supabase Owner/Admin Authentication

## Scope

- Admin Control Plane is served at `/admin`.
- The existing POS application and its PRODX backend authentication remain unchanged.
- Admin login uses Supabase Auth email/password; this UI intentionally does not expose public sign-up.
- The page reads the signed-in user's own `public.user_roles` row and grants the admin UI only to `owner` or `admin`.

## Required environment

Set these Vite environment variables in the deployment environment (never commit values in an env file):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The existing `src/lib/supabase.ts` client validates both values and uses the publishable key. Never expose a Supabase secret/service-role key in browser code.

## Supabase dashboard setup

1. Open Authentication → Providers and configure email/password sign-in.
2. Provision administrator accounts through an authorized workflow; do not enable public sign-up for the admin portal.
3. Assign the role in `public.user_roles` through a trusted administrative/database process. Do not allow users to self-assign roles.
4. Configure the strongest password-strength options available on the current plan. Prefer a minimum length of at least 12 characters and require mixed character classes if the dashboard exposes those options.
5. Configure Auth rate limits and enable CAPTCHA/bot protection where supported and appropriate for the deployment.
6. Confirm the deployed URL is configured under Authentication URL Configuration / Redirect URLs as applicable.
7. Review the Security Advisor after configuration changes.

### Free Plan limitation: leaked-password protection

Supabase documents leaked-password protection as a Pro Plan (or higher) feature. On Free Plan, do not treat the disabled `auth_leaked_password_protection` advisor as a configuration mistake that can be fixed through application code, and do not upgrade the project solely to clear this warning.

This means Free Plan does not provide Supabase Auth's built-in check against the HaveIBeenPwned.org Pwned Passwords dataset. Password length/complexity rules, rate limits, CAPTCHA, and MFA where available are useful defense-in-depth but are **not equivalent** to checking whether a password has been leaked. Keep this limitation documented as an accepted plan constraint and do not mark the leaked-password-protection security check as passed.

Do not implement a custom password breach checker in the browser or log/store raw passwords. Any future alternative must be reviewed for privacy, reliability, rate limiting, and secure server-side handling before adoption.

## MCP

The root `.mcp.json` points developer MCP clients at the official Supabase MCP server scoped to this project. Authenticate through the MCP client's OAuth flow. The project ref is not a credential. ChatGPT's existing connected Supabase tools are a separate client connection.

## Security boundary

The `/admin` gate protects UI navigation only. Every privileged API and data operation must independently validate the Supabase access token server-side, check the current role from a trusted source, and enforce tenant/store scope. Database tables exposed through the Data API need appropriate grants and RLS policies. Do not treat a hidden UI as authorization.

The existing `public.user_roles` RLS policy currently permits authenticated users to read only their own role row. Preserve that isolation. Role changes must be performed by trusted administrative processes.

## Verification checklist

- [ ] Set deployment environment variables without committing secret values.
- [ ] Verify valid admin can sign in and reaches the admin view.
- [ ] Verify cashier/manager/role-less users are denied.
- [ ] Verify unauthenticated users see the sign-in form.
- [ ] Verify sign-out clears the session.
- [ ] Verify direct access to protected APIs is denied without valid server-side authorization.
- [ ] Verify available password-strength settings and Auth rate limits in the Free Plan dashboard.
- [ ] Enable CAPTCHA/bot protection where supported and verify its production flow.
- [ ] Record leaked-password protection as unavailable on Free Plan; do not mark that check passed.
- [ ] Run lint, build, tests, architecture/security/database gates, and CI for the exact commit before production rollout.
