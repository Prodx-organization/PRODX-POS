# Production Principles

## Financial integrity
Authoritative money uses PostgreSQL NUMERIC/DECIMAL. JavaScript floating-point values must never become the source of truth for monetary amounts.

## Inventory integrity
Inventory is authoritative on the server. Stock changes are controlled movements protected against invalid quantities, tenant crossover and concurrency errors.

## Security by default
Authentication, authorization, tenant isolation, secret handling, session lifecycle, validation and auditability are mandatory boundaries.

## Multi-tenant isolation
Every organization-owned operation carries explicit tenant scope. Store-scoped operations additionally resolve store context from trusted server state.

## Offline resilience
Offline mode preserves availability but never becomes an authority override. Client outbox commands are replayed idempotently against the server.

## Auditability
Security-sensitive and business-critical mutations require durable audit evidence with actor, tenant/store context, action, target, timestamp and correlation information appropriate to the operation.

## Idempotency
Retryable writes must not create duplicate financial or inventory effects. Durable idempotency keys and database uniqueness are required at the correct tenant/operation scope.

## Server authority
The client requests an operation; only the authoritative backend finalizes it.

## Evidence over assumption
Production status requires executable evidence: passing CI, migration tests, integration tests, security checks, recovery drills, deployment evidence and review records.
