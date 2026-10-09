---
name: prodx-production-readiness
description: Use for release decisions, production audits, incident follow-up, deployment verification, or reconciliation of architecture/security/database/operational gates.
---

# Production Readiness Evidence

## Source-of-truth order

1. Current repository branch and exact commit.
2. Source code and executable tests.
3. CI/CD results for the exact commit.
4. Database schema/migrations and production configuration.
5. Runtime/deployment and integration evidence.
6. Repository documentation and issue/PR status.
7. Conversation or memory as context only.

If sources disagree, report the discrepancy. Do not treat stale evidence as current.

## Gate states

Every applicable gate must be **PASS**, **FAIL**, **BLOCKED**, or **UNVERIFIED**.

- PASS: direct, current evidence satisfies the acceptance criteria.
- FAIL: direct evidence demonstrates a violation.
- BLOCKED: an external prerequisite prevents verification or execution.
- UNVERIFIED: evidence is absent, incomplete, or stale.

For each gate record exact SHA, code/config paths, test names, CI run/check, runtime/database evidence, and known limitations.

## Mandatory gate families

- Architecture and production wiring (route -> service -> domain -> repository/provider).
- Authentication, authorization, tenant/store isolation, secret handling.
- PostgreSQL constraints, migration ordering/replay, transactions, rollback/recovery.
- Financial integrity and external payment lifecycle.
- Inventory ledger, concurrent mutation, refund/void reversal.
- Idempotency for retries, offline replay, and callbacks.
- Audit coverage and immutability.
- Offline queue/outbox, ordering, retry, conflict, and completion semantics.
- API/integration and negative-path tests.
- Lint/typecheck/build/full test suite and required CI.
- Observability, alerting, readiness/health, correlation, redaction.
- Automated backup, restore verification, DR exercise with RPO/RTO.
- Deployment configuration, rollout/rollback, secrets, resource limits.

## Deployment verification

- Confirm deployment source SHA equals the intended current commit.
- Check build/deployment status, then perform HTTP smoke against the deployed aliases and verify expected status/body for health, readiness, and key non-destructive routes.
- A Vercel `READY` state proves deployment completion only; it does not prove API readiness, database connectivity, settlement correctness, or full production readiness.
- Do not execute destructive financial operations against production just to test them. Use isolated integration environments or provider sandboxes.

## Stop/continue rules

- Continue fixing a blocker when the root cause can be changed safely in a scoped branch and tested.
- Do not bypass protections, weaken gates, merge without authorization, or alter production secrets.
- Do not create duplicate PRs/issues; search and reconcile existing tracking first.
- Do not close a blocker issue until acceptance criteria have current evidence.
- If code/runtime access is unavailable, identify the exact blocker and the smallest next action needed.

## Final report

Report current SHA, deployment SHA/state, PR/CI evidence, changes, tests actually executed, PASS/FAIL/BLOCKED/UNVERIFIED gates, critical blockers, and next action. Never declare Production Ready while any required critical gate is not PASS.
