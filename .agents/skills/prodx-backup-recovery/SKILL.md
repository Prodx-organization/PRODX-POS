---
name: prodx-backup-recovery
description: Validates PRODX-POS PostgreSQL backup coverage, encryption/access controls, retention, restore integrity, RPO/RTO, and disaster-recovery drills.
---

# PRODX-POS Backup and Disaster Recovery

## Non-negotiable rules
- A backup job reporting success is not proof of recoverability. Restore into an isolated target and verify data and application invariants.
- Define approved RPO/RTO, recovery ownership, retention, encryption, access controls, and incident/runbook steps.
- Keep backup credentials least-privileged and separate from normal application runtime identities.
- Protect backup artifacts and logs from exposing customer, financial, or credential data.
- Verify point-in-time recovery and provider-native backups separately from custom logical dumps; do not assume one proves the other.
- Recovery procedures must account for schema/migration versions, idempotency, audit history, and external payment reconciliation.
- Do not run destructive restore drills against production. Use an isolated disposable environment and explicit authorization.

## Procedure
1. Identify backup mechanism, schedule, scope, retention, encryption, ownership, and failure alerts.
2. Restore a recent representative backup into an isolated PostgreSQL target.
3. Run integrity checks: migrations, row counts/checksums where appropriate, constraints, tenant isolation, ledger balance, and critical queries.
4. Measure actual recovery duration and data-loss window.
5. Exercise application connection, smoke tests, and reconciliation after restore.
6. Record the drill date, source backup, target environment, measured RPO/RTO, failures, and remediation.

## Checklist
- [ ] Backup automation and retention are configured.
- [ ] Backup storage is encrypted and access-controlled.
- [ ] Restore was executed successfully in an isolated target.
- [ ] Restored schema and critical data invariants were verified.
- [ ] RPO/RTO are approved and measured.
- [ ] Alerts and recovery ownership are tested.
- [ ] DR drill findings have owners and closure evidence.

## Evidence contract
Require a dated restore log, isolated target details, integrity-test results, and measured recovery timings. A documented plan without an executed drill is **PLANNED/UNVERIFIED**, not PASS. If no safe target or backup is available, mark **BLOCKED** and do not attempt a production restore.
