# Supabase source of truth

**Effective immediately: PRODX-POS uses exactly one Supabase project.**

- Project name: `PRODX-POS`
- Project ref: `bbxoywnlayduqbrjeixj`
- Region: `ap-southeast-1`
- Project URL: `https://bbxoywnlayduqbrjeixj.supabase.co`

## Prohibited legacy project

The project ref `sjgwesmmpegtzsqqqhvd` is retired for this application. Do not use it for Auth, database connections, Edge Functions, secrets, migrations, preview environments, production configuration, monitoring, or new documentation. Do not create new dependencies on it. Existing references must be removed as part of the remediation and checked in CI.

## Runtime and deployment rules

- Supabase Auth, project API URLs, and database infrastructure for this application must point to the `PRODX-POS` project above.
- The production PostgreSQL connection must remain least-privilege and fail closed. Never fall back to an administrative database URL.
- The database broker URL, if used, must be hosted in the `PRODX-POS` project only.
- The connected `PRODX-POS` project was inspected on 2026-10-24 and returned no Edge Functions. Therefore changing the broker URL alone does **not** prove the broker exists or that production readiness works. The broker must be implemented/deployed in this project and configured with the least-privilege application connection before production can be considered ready.
- Verify `GET /api/v1/readyz` against the deployed production runtime after wiring; do not mark ready based on unit tests alone.

## Verification evidence (2026-10-24)

The connected Supabase project list returned only the active/healthy project `PRODX-POS` with ref `bbxoywnlayduqbrjeixj`. The connected account listed no Edge Functions for that project. A live production check returned HTTP 200 for `/api/v1/healthz`, HTTP 503 (`NOT_READY`) for `/api/v1/readyz`, and HTTP 200 for the frontend.

**Status: NOT PRODUCTION READY** until the correct project's least-privilege database path is deployed and live readiness succeeds.
