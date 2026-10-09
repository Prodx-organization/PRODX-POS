---
name: prodx-postgresql
description: Use for PostgreSQL schema, migration, transaction, locking, query, backup, restore, and database-integrity changes or reviews.
---

# PostgreSQL Production Engineering

## Required workflow

1. Read `AGENTS.md`, database architecture docs, migration conventions, and the relevant schema/repository/service/tests.
2. Trace the real path from HTTP/controller through application service and repository to PostgreSQL. Do not infer production wiring from a class existing.
3. Identify transaction boundaries, isolation assumptions, lock order, retry behavior, tenant/store scope, and all writers of the affected data.
4. Make the smallest safe change; preserve existing migration order and architecture boundaries.
5. Add regression coverage, preferably PostgreSQL integration tests for constraints, migrations, concurrency, and rollback behavior.
6. Run the targeted tests plus the applicable database, architecture, security, typecheck, lint, and build gates. Record exact results and commit SHA.

## Invariants

- PostgreSQL is the source of truth for authoritative business state.
- Monetary values use `NUMERIC`/`DECIMAL` and exact decimal semantics; never introduce floating-point money.
- Enforce critical invariants in the database with appropriate `NOT NULL`, `CHECK`, `UNIQUE`, foreign-key, and append-only protections.
- Migrations must be deterministic, ordered, safe to apply, and consistent with the project's migration runner/ledger. Check duplicate heads and upgrade behavior.
- Make UTC timestamp behavior explicit and consistent with the architecture.
- Keep transaction boundaries explicit. Avoid network/provider calls while holding database locks unless the documented design requires it.
- Tenant/store scoping must be enforced in every relevant query and relationship.
- Concurrency-sensitive writes require an explicit lock/constraint/serializable strategy and tests for competing requests.

## Verification checklist

- [ ] Migration applies against a clean supported PostgreSQL instance.
- [ ] Reapplying follows the documented idempotency contract.
- [ ] Constraints reject invalid states, including cross-tenant references.
- [ ] Rollback/downgrade behavior is documented and tested where supported.
- [ ] Concurrent operations cannot violate invariants.
- [ ] Query plans/indexes are considered for material hot paths.
- [ ] Backup and restore claims have execution evidence, not documentation alone.
- [ ] Relevant PostgreSQL CI job passed on the exact SHA.

## Failure cases to probe

Duplicate migration application, partial migration failure, deadlock/lock timeout, concurrent stock or payment writes, orphan references, tenant-scope omission, timezone drift, restore from an unverified backup, and schema drift between test and production.

## Reporting

For every claim cite the migration path, schema constraint, repository/service path, test path, and exact CI/runtime result. Missing evidence is **UNVERIFIED**; infrastructure preventing a test is **BLOCKED**. Never report a database gate as PASS based only on mocked repositories or SQLite.
