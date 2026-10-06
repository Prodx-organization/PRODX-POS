# API

The API is the authoritative application boundary.

## Contract

- authenticated request context
- input validation
- tenant/store scope
- deterministic authorization
- structured errors
- idempotency for retryable writes
- transaction boundaries for critical mutations
- audit hooks for sensitive operations
- OpenAPI documentation for supported public endpoints

Clients may calculate display values for UX, but final business results are calculated and validated by the authoritative backend.
