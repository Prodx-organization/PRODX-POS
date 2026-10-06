# Production Readiness

Production readiness is an evidence gate.

## Required evidence

### Architecture
Approved decisions, dependency-direction checks and tenant-isolation checks.

### Application
Authentication/authorization, business invariants, idempotency/concurrency and audit behavior.

### Database
PostgreSQL integration tests, migration validation, backup/restore drill and schema integrity.

### Security
Secret hygiene, security scans, authentication/authorization tests and no client-authoritative security decisions.

### Offline
Outbox durability, replay, duplicate replay, failure/retry and conflict handling.

### Operations
Deployment evidence, observability, incident runbook and rollback/recovery procedure.

### Release
Review complete, required CI green, main-branch verification green and no known blocker.

{% hint style="danger" %}
Do not mark PRODX Production Ready because a checklist exists. The status must be supported by current executable evidence.
{% endhint %}
