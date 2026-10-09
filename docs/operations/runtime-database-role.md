# Production Runtime Database Role

## Security boundary

The Vercel database broker must return a connection URL for the dedicated `prodx_app` role. It must not return the platform's administrative `SUPABASE_DB_URL` to the application runtime. The broker authenticates the Vercel production OIDC token and fails closed with HTTP 503 if the `PRODX_APP_DB_URL` Edge Function secret is absent.

`db/migrations/0033_security_prodx_app_role.sql` provisions the role and grants the runtime permissions. Apply migrations with a privileged migration identity; never use the runtime role to administer schema migrations. The runtime role is `NOSUPERUSER`, `NOBYPASSRLS`, and is granted explicit RLS policies because tenant authorization is enforced by the trusted server application.

## Required production provisioning

1. Apply migration `0033_security_prodx_app_role.sql` using the deployment/migration identity.
2. Set a strong, unique password for `prodx_app` through the managed database administrative channel. Do not commit or log the password.
3. Configure the Supabase Edge Function secret `PRODX_APP_DB_URL` as a PostgreSQL URL using username `prodx_app`, the chosen password URL-encoded, and the correct database name. The broker accepts only the configured project's direct host or session-pooler host, rewrites direct connections to the IPv4 session pooler, normalizes the pooler role suffix, and forces `sslmode=require`.
4. Deploy the `prodx-db-broker` Edge Function. Do not expose `PRODX_APP_DB_URL` to the browser or Vercel frontend environment.
5. Verify the broker returns a URL whose username is `prodx_app.<project-ref>` and whose password is never printed. Verify `current_user = 'prodx_app'`, `rolsuper = false`, `rolbypassrls = false`, and required transaction flows work under that role.
6. Keep a rollback plan that restores the prior deployment only if security review explicitly authorizes the prior database identity; do not silently fall back to `SUPABASE_DB_URL`.

## Fail-closed behavior

Missing `PRODX_APP_DB_URL` returns HTTP 503 (`runtime-db-url-unavailable`); invalid protocols, unsupported hosts, or a pooler role suffix for another project return HTTP 503 (`runtime-db-url-invalid`). Authentication failures remain HTTP 401 and OIDC scope failures remain HTTP 403, so database configuration errors are not misreported as authentication failures. Invalid connection URLs are rejected instead of being returned to the application. This is intentional: the broker must not silently elevate the POS runtime to the default Supabase database administrator role or pass an HTTP project URL to the PostgreSQL driver. Production deployment is blocked until the secret is provisioned and runtime identity is verified end-to-end.

## Verification

Run the Deno URL tests with `deno test supabase/functions/prodx-db-broker/url.test.ts`. The server CI also runs `server/db/prodx-db-broker-url.test.ts`, covering direct-host rewrite, least-privilege role preservation, TLS enforcement, and rejection of unsupported protocols/hosts.
