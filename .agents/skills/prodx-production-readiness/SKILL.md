---
name: prodx-production-readiness
description: Applies PRODX-POS production release gates using current repository, CI, database, runtime, security, financial, inventory, sync, and recovery evidence.
---

# PRODX-POS Production Readiness Gate

## Decision rule
Never declare Production Ready from a checklist, percentage, implementation existence, unit tests, or memory. Every applicable gate must have current evidence tied to the candidate commit and deployed runtime.

## Required gates
- Architecture and production wiring
- Authentication, authorization, tenant/store isolation, and secret handling
- PostgreSQL schema, grants/RLS, deterministic migrations, and live runtime identity
- Financial integrity and external payment lifecycle/reconciliation
- Inventory ledger, concurrency, reversal, and reconciliation
- Durable idempotency for retryable mutations/callbacks
- Offline outbox lifecycle, replay, conflict/order handling, and restart recovery
- Audit coverage and immutability
- API and production-boundary integration tests
- Full required test suite, lint/typecheck/build, architecture/security/database gates
- Exact-head CI and enforced branch protections
- Runtime health/readiness, observability, alerts, and resource configuration
- Backup restore evidence, approved RPO/RTO, DR drill
- Deployment promotion, rollback/compensation, and post-deploy verification

## Evidence workflow
1. Establish the candidate branch, HEAD SHA, working-tree state, and production deployment SHA.
2. Read the repository instructions and relevant architecture/operations docs.
3. For each gate, record status, evidence links/paths, exact SHA/time, and missing proof.
4. Verify the deployed runtime independently; a preview or CI run is not production evidence.
5. Distinguish implementation from wiring, tests from runtime behavior, and planned operations from executed drills.
6. Assign each blocker an owner/dependency and the safest next action.
7. Re-run affected gates after changes and post-deployment.
8. Publish a concise status report without hiding failed or unavailable checks.

## Status vocabulary
- **PASS**: current direct evidence proves the gate.
- **FAIL**: direct evidence shows the gate is violated.
- **BLOCKED**: the gate cannot be executed because a prerequisite/access/infrastructure is unavailable.
- **UNVERIFIED**: evidence is missing, stale, indirect, or insufficient.
- **NOT APPLICABLE**: a documented reason proves the gate does not apply.

## Hard-stop conditions
- Any required gate is FAIL, BLOCKED, or UNVERIFIED.
- Production readiness endpoint fails.
- Runtime DB role is not proven least-privileged.
- Required CI check fails or is missing.
- Branch ruleset enforcement is disabled.
- Financial, inventory, idempotency, offline-sync, audit, backup/restore, or recovery evidence is missing.

## Output
Report overall status as **NOT PRODUCTION READY** if any applicable required gate is not PASS. List current production SHA, gate-by-gate evidence, blockers, owner/dependency, and next action. Never merge or deploy to bypass a failed gate.
