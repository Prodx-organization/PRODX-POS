# PRODX Production Engineering Skills

These repository-local skills are review and execution contracts for production-risk work. They supplement (never override) the root `AGENTS.md`, architecture boundaries, CI workflows, and repository source of truth.

## Skills

- `prodx-postgresql` — migrations, constraints, transactions, locking, and recovery evidence.
- `prodx-financial-integrity` — exact money arithmetic and sale/payment/refund/void invariants.
- `prodx-security` — authentication, authorization, tenant/store isolation, sessions, and secrets.
- `prodx-concurrency-idempotency` — retry safety, race conditions, and exactly-once effects.
- `prodx-production-readiness` — evidence-based gate reconciliation and release decisions.

## Invocation

An agent should read the matching `SKILL.md` before changing or reviewing the corresponding subsystem. Cross-cutting work must use all relevant skills, not just one.

## Evidence contract

Every gate must be classified as **PASS**, **FAIL**, **BLOCKED**, or **UNVERIFIED**.

- **PASS** requires exact repository paths, executable test/CI evidence, and runtime/database evidence where applicable.
- **FAIL** means observed evidence violates a requirement.
- **BLOCKED** means required verification could not run because of an external prerequisite or infrastructure limitation.
- **UNVERIFIED** means evidence is absent, stale, or insufficient.

Never convert BLOCKED or UNVERIFIED to PASS. A successful build or deployment status alone does not prove financial correctness or production readiness. Do not weaken, skip, or delete gates to obtain a green result.
