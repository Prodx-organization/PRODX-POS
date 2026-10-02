# PRODX-POS AI Engineering Skill Catalog

This catalog is the canonical map for agent skills in this repository.

## Canonical skill groups

| Order | Skill | Production concern |
|---:|---|---|
| 01 | `prodx-postgresql` | Database integrity boundary |
| 02 | `prodx-financial-integrity` | Monetary correctness and financial effects |
| 03 | `prodx-inventory-integrity` | Stock correctness and reconciliation |
| 04 | `prodx-security` | Authentication, authorization, isolation |
| 05 | `prodx-concurrency-idempotency` | Race safety and duplicate-effect prevention |
| 06 | `prodx-offline-sync` | Queue/replay/retry/conflict lifecycle |
| 07 | `prodx-testing` | Integration, concurrency, failure and contract evidence |
| 08 | `prodx-observability` | Logs, metrics, traces and audit evidence |
| 09 | `prodx-ci-cd` | CI gates, migration checks and delivery safety |
| 10 | `prodx-backup-recovery` | Backup, restore and disaster recovery |
| 11 | `prodx-production-readiness` | Cross-gate evidence and final readiness assessment |
| 12 | `prodx-architecture` | Dependency boundaries and production wiring |

## Evidence contract

Every production claim must distinguish implementation from verification.

### PASS
Use only when evidence is available, for example:

- test path / test result
- migration or schema evidence
- CI workflow/check result
- runtime/integration evidence
- relevant configuration or deployment evidence

### UNVERIFIED
Use when the implementation may exist but the required evidence is missing, stale, inaccessible, or not applicable to the claimed path.

### BLOCKED
Use when a required gate cannot pass because a concrete dependency or production blocker remains.

## Skill checklist contract

Each skill should contain:

1. Scope
2. Non-negotiable rules
3. Inspection checklist
4. Required evidence
5. Failure cases
6. Production-wiring checks
7. Relevant test commands
8. Exit/reporting format

## Priority model

For POS production work, the evidence-first order is:

**Database → Financial/Inventory Integrity → Security → Concurrency/Idempotency → Offline Sync → Testing → Observability → CI/CD/Infrastructure → Backup/Recovery → Production Readiness**

This ordering reflects dependency and risk, not a claim that later domains are optional.

## Existing implementation

The repository currently has:

`.agents/skills/prodx-code-review/`

Do not create parallel skills that duplicate its scope. New skills should be added only when their boundary and evidence contract are clear.

## Naming and placement

Use:

`.agents/skills/<skill-name>/SKILL.md`

Supporting material may live beside the skill when it is specific to that skill. Shared engineering policy belongs in `docs/architecture/` or the repository-level engineering guidance rather than being copied into every skill.
