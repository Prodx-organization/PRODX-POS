# Offline & Synchronization

Offline mode preserves store continuity during temporary connectivity loss.

## Rules

- Client writes are durable outbox candidates.
- Server remains authoritative.
- Replay is idempotent.
- Commands have explicit lifecycle states.
- Failures are observable and retryable according to policy.
- Conflicts never silently overwrite authoritative state.

## Required production tests

Disconnect, enqueue, reconnect, replay, duplicate replay, partial failure, ordering and conflict behavior.
