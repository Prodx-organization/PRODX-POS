# API Error & Idempotency Contract

## Error classes

Validation, authentication, authorization, not-found, conflict/concurrency, idempotency replay, business-rule rejection and infrastructure/dependency failure should be distinguishable.

## Idempotency

For retryable writes:

1. validate the key;
2. bind it to authenticated tenant and operation;
3. atomically record the first accepted request;
4. return the same logical result for safe retries;
5. prevent concurrent duplicate effects.

An idempotency key must never allow one tenant to replay another tenant's operation.
