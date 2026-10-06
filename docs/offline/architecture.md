# Offline Architecture

```mermaid
sequenceDiagram
 participant POS as POS Client
 participant IDB as IndexedDB Outbox
 participant API as Authoritative API
 participant DB as PostgreSQL
 POS->>IDB: Persist command
 POS-->>POS: Continue offline
 POS->>API: Replay + idempotency key
 API->>DB: Transaction + invariants
 DB-->>API: Authoritative result
 API-->>POS: Accepted / rejected / conflict
 POS->>IDB: Complete or retry
```

## Lifecycle

A production command lifecycle should be explicit, for example `pending -> replaying -> completed`, with `replaying -> failed -> retryable/terminal`.

Commands must not remain permanently in a received-only state.

## Conflict authority

The client never resolves financial or inventory conflicts by itself. The server returns the authoritative outcome.
