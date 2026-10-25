# PRODX production database broker

Supabase Edge Function that hands the PRODX Vercel production deployment the connection URL of the
restricted `prodx_app` PostgreSQL role. The server resolves it at startup via `PRODX_DB_BROKER_URL`
(see `server/db/postgres.ts`).

Nothing in this directory is deployed by CI. Deploying it, setting its secrets, and running migrations
are manual, owner-approved steps.

## Files

- `handler.ts`: runtime-neutral request handler and config validation (unit-tested in `server/broker/handler.test.ts`).
- `index.ts`: Deno/Supabase entrypoint that wires Vercel OIDC verification (`jose`, RS256, remote JWKS) into the handler.

## Behavior

- `GET` only. Anything else returns 405.
- Missing or invalid configuration returns 503 for every request (fail closed).
- Missing or malformed `Authorization: Bearer` returns 401. A token that fails signature, issuer, audience or expiry checks returns 401 with no detail.
- A verified token whose `sub` is not in the allow-list returns 403.
- Success returns `200 {"databaseUrl": "..."}` with `Cache-Control: no-store`.
- Tokens, connection URLs and raw verification errors are never logged or returned.
- Configuration is rejected (broker returns 503) if the database URL does not use the `prodx_app` role, so an administrative or service-role connection string cannot be served by mistake.

## Secrets (set in Supabase, never in git)

| Name | Value |
| --- | --- |
| `PRODX_OIDC_ISSUER` | `https://oidc.vercel.com/<team-slug>` |
| `PRODX_OIDC_AUDIENCE` | `https://vercel.com/<team-slug>` |
| `PRODX_OIDC_ALLOWED_SUBJECTS` | Comma-separated exact `sub` values, e.g. `owner:<team-slug>:project:<project-name>:environment:production`. Do not allow `preview` or `development`. |
| `PRODX_RUNTIME_DATABASE_URL` | Pooler connection URL for the `prodx_app` role (`postgresql://prodx_app.<project-ref>:<password>@<pooler-host>:5432/postgres`). |

Verify the exact `iss`, `aud` and `sub` values from a real Vercel production OIDC token before enabling.

## Deploy

Deploy as a function named `prodx-db-broker` with **JWT verification disabled** (`verify_jwt = false`).
Callers authenticate with a Vercel OIDC token, not a Supabase JWT, and the function verifies that token itself.
Then set `PRODX_DB_BROKER_URL` on the Vercel production environment to the function URL
(`https://<project-ref>.supabase.co/functions/v1/prodx-db-broker`).

## Database prerequisites

Run `bun run db:migrate` against the target project with an administrative connection first (it creates the
`prodx_app` role without a password), then set the role's password and use it in `PRODX_RUNTIME_DATABASE_URL`.
Migrations 0033, 0034 and 0036 only touch `public.prodx_*` tables, so other applications sharing the
database (for example the Owner Console's `public.user_roles`) stay unreachable from `prodx_app`.
