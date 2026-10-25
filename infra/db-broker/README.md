# PRODX production database broker

Supabase Edge Function that returns the connection URL for the restricted `prodx_app` PostgreSQL role to the PRODX Vercel production deployment. The server calls it through `PRODX_DB_BROKER_URL`.

Nothing in this directory is deployed by CI. Deploying the function, setting its environment, and running database migrations are owner-approved operations. Do not deploy or configure the broker until the canonical POS database project and host have been independently verified.

## Files

- `handler.ts`: runtime-neutral request handler and fail-closed configuration validation.
- `target.ts`: shared, deterministic checks for the exact database host/project and broker endpoint.
- `index.ts`: Deno/Supabase entrypoint that verifies Vercel OIDC using `jose` and confirms the function is running in the approved broker project.

## Trust and target identity

The broker and Vercel server both fail closed unless all target identity fields are configured:

- `PRODX_DB_BROKER_PROJECT_REF`: exact 20-character Supabase project ref that hosts the broker function.
- `PRODX_DB_ALLOWED_PROJECT_REF`: exact 20-character Supabase project ref that owns the POS transactional database.
- `PRODX_DB_ALLOWED_HOST`: exact PostgreSQL host for that database, with no scheme or port.
- `PRODX_DB_BROKER_URL`: exactly `https://<broker-project-ref>.supabase.co/functions/v1/prodx-db-broker`.

Database URL rules:

- For a Supabase pooler host such as `aws-0-<region>.pooler.supabase.com`, the username must be exactly `prodx_app.<database-project-ref>`.
- For a direct Supabase host, the host must be exactly `db.<database-project-ref>.supabase.co` and the username must be exactly `prodx_app`.
- Other hosts, mismatched project refs, admin/service roles, missing target values, URL paths, and non-HTTPS broker endpoints are rejected.
- The server validates the broker endpoint before sending the Vercel OIDC bearer token, so a misconfigured URL cannot forward that token to an arbitrary host.
- Never infer the canonical target from the currently connected Supabase project. Verify the approved POS data-plane identity first; do not use an Owner/Auth project that has no POS schema.

## Authentication behavior

- `GET` only; other methods return 405.
- Missing or invalid configuration returns 503 for every request.
- Missing or malformed `Authorization: Bearer` returns 401.
- Vercel OIDC signature, issuer, audience, expiry, and algorithm are verified with remote JWKS; a verified `sub` must exactly match the allow-list.
- A valid token from a preview/development deployment is rejected unless its exact subject is explicitly allow-listed.
- Success returns `200 {"databaseUrl":"..."}` with `Cache-Control: no-store`.
- Tokens, connection URLs, hostnames, and raw verification errors are never logged or returned.

## Supabase Edge Function environment

Set only after verifying the canonical target. Never put the database URL/password in git or chat.

| Name | Value |
| --- | --- |
| `PRODX_DB_BROKER_PROJECT_REF` | The project ref of the Supabase project actually hosting this function. |
| `PRODX_OIDC_ISSUER` | `https://oidc.vercel.com/<team-slug>` |
| `PRODX_OIDC_AUDIENCE` | `https://vercel.com/<team-slug>` |
| `PRODX_OIDC_ALLOWED_SUBJECTS` | Comma-separated exact Vercel production `sub` values; do not allow preview/development subjects. |
| `PRODX_DB_ALLOWED_HOST` | Exact verified PostgreSQL host, no scheme or port. |
| `PRODX_DB_ALLOWED_PROJECT_REF` | Exact 20-character POS database project ref. |
| `PRODX_RUNTIME_DATABASE_URL` | Restricted-role connection URL for the approved database target. |

Supabase provides `SUPABASE_URL`; the entrypoint compares its project ref with `PRODX_DB_BROKER_PROJECT_REF` before enabling the handler.

## Vercel production environment

Set the same `PRODX_DB_ALLOWED_HOST` and `PRODX_DB_ALLOWED_PROJECT_REF` values as the broker, plus:

- `PRODX_DB_BROKER_PROJECT_REF`: exact project ref hosting the broker.
- `PRODX_DB_BROKER_URL`: `https://<broker-project-ref>.supabase.co/functions/v1/prodx-db-broker`.
- `PRODX_DB_ALLOWED_HOST`: exact approved database host.
- `PRODX_DB_ALLOWED_PROJECT_REF`: exact approved POS database project ref.

Deploy the function with Supabase JWT verification disabled (`verify_jwt = false)); the function validates Vercel OIDC itself. Do not set any of these values until the canonical POS data plane is verified. No production migration or deployment is performed by this change.
