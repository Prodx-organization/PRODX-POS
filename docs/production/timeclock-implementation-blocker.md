# Timeclock Production Wiring Blocker

Status: NOT PRODUCTION READY

Verified against `main` and `feat/timeclock-production-wiring`.

## Evidence

- `src/adapters/productionShiftApi.ts` still throws for `clockIn`, `clockOut`, and `getTimeclockRecords`.
- `server/entrypoint.ts` registers the production Shift route but does not register a Timeclock route.
- `db/migrations/0003_m1_1_auth_identity.sql` defines `prodx_user_credentials` with `user_id` as the primary key and permits only `credential_type = 'password'`.
- Existing authentication uses the server-authenticated principal for organization/store scope.

## Required implementation

Timeclock must be implemented as a server-owned capability:

1. Separate Timeclock credential/provisioning model; do not weaken the existing password credential invariant.
2. Hash PIN secrets; never persist plaintext PINs.
3. Store/organization scope must come from the authenticated server principal, not client-provided authority.
4. Add clock-in/clock-out persistence with PostgreSQL transaction boundaries and concurrency protection.
5. Add idempotency for retryable clock operations.
6. Add audit events for clock-in/out and credential security events.
7. Add RBAC and failed-attempt/lockout controls appropriate to Timeclock.
8. Wire HTTP routes into the production entrypoint.
9. Replace the production adapter's not-implemented methods with real HTTP calls.
10. Add database, API, concurrency, security, and regression tests.

Do not mark this blocker complete until the full production route is exercised and CI evidence exists.
