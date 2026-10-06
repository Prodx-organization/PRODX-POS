# Migration & Integrity Policy

Every schema change must have a unique revision, be reviewable, apply to a supported empty database, upgrade from the previous supported state and pass the repository migration gates.

## Integrity

Database constraints must enforce invariants that cannot safely depend only on application code: required relationships, valid quantities/rates, uniqueness boundaries and tenant ownership.

## Money

Authoritative monetary columns use PostgreSQL NUMERIC/DECIMAL. Floating-point persistence is prohibited for money.

## Recovery

Migration and restore behavior must be tested in CI/ephemeral PostgreSQL environments. Compilation success is not database readiness.

## Gate

A migration failure blocks the affected release. Do not create a second migration head merely to bypass a conflict; reconcile the migration history explicitly.
