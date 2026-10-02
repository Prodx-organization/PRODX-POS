# PRODX-POS Project Index

> Navigation map for the production-engineering repository. This index organizes existing material; it does not redefine implementation status.

## Source-of-truth order

1. Repository / current branch
2. Source code and tests
3. CI/CD and workflow results
4. Database schema, migrations, and configuration
5. Repository documentation
6. Project instructions
7. Memory / conversation context

## Repository areas

| Area | Purpose |
|---|---|
| `.agents/` | AI-agent skills and engineering guidance |
| `.github/` | CI/CD workflows and issue templates |
| `db/` | PostgreSQL schema, migrations, and database notes |
| `docs/` | Architecture, engineering decisions, and milestone documentation |
| `scripts/` | Operational and CI/migration scripts |
| `server/` | Backend/runtime composition |
| `src/` | Frontend/application source |
| `public/` | Static assets |

## Documentation map

### Architecture
- `docs/architecture/ADR-001-database-backend-foundation.md`
- `docs/architecture/PRODX-ENGINEERING-OPERATING-MODEL.md`

### Database / authentication milestones
- `docs/database-m1-1-auth-identity.md`
- `docs/database-m1-2-rbac.md`
- `docs/database-m1-3-device-session.md`
- `docs/database-m1-domain-foundation.md`
- `docs/m2-auth-db-integration.md`
- `docs/m2-auth-db-repository.md`
- `docs/m2-auth-enforcement-foundation.md`
- `docs/m2-lockout-policy.md`

### Agent / execution guidance
- `docs/antigravity-pro-runner.md`
- `.agents/skills/prodx-code-review/`

## Production engineering skill taxonomy

The requested PRODX skill model is grouped by production risk rather than by feature name:

1. **Database** — PostgreSQL, transactions, constraints, migrations, concurrency
2. **Financial integrity** — money precision, payment/refund/void, atomicity, ledger integrity
3. **Inventory integrity** — stock mutation, concurrency, reconciliation
4. **Security** — authentication, authorization, RBAC, isolation, secure defaults
5. **Idempotency & offline sync** — retry safety, replay, conflicts, ordering
6. **Testing** — unit/integration/E2E, PostgreSQL, concurrency, failure injection, contracts
7. **Observability** — logs, metrics, tracing, correlation IDs, auditability
8. **CI/CD & infrastructure** — quality gates, migrations, security scanning, deployment
9. **Backup & recovery** — backup, restore, RPO/RTO, disaster recovery
10. **Production readiness** — evidence-based gates across the above domains

See `.agents/skills/README.md` for the skill catalog and evidence rules.

## Organization rules

- Keep architecture decisions under `docs/architecture/`.
- Keep database/milestone evidence in `docs/` until a stable domain-specific taxonomy is justified by the repository.
- Keep AI-agent skills under `.agents/skills/`.
- Do not duplicate the same gate/checklist across multiple skills; link to the canonical source instead.
- A skill may report **PASS** only with concrete evidence. Without evidence, use **UNVERIFIED**.
- Do not infer production readiness from branch names, class/function existence, or unit-test presence alone.
- Do not delete or mass-rename historical branches as part of documentation cleanup.

## Current repository hygiene note

The repository currently contains many historical feature/chore branches, including multiple generations of production-skill and database-gate branches. They are retained as history; cleanup of remote branches should be a separate, explicitly reviewed maintenance action.
