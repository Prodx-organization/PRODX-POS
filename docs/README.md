# PRODX POS — Production Documentation

> Current infrastructure transition status: [Engineering Status — 2026-10-25](STATUS-2026-10-25.md). This supersedes older status snapshots for the current database-target decision.

**Status:** Evidence-driven engineering documentation  
**Source of truth:** `Prodx-organization/PRODX-POS`  
**Last documentation review:** 2026-10-15  
**Reviewed baseline:** `main` at `652f2a7282d4f5b57ab1fe16bfc2bc731655b918`

PRODX POS is a production-oriented retail POS platform. A documented capability is not automatically an implemented or production-verified capability.

> Use **Verified** only for current repository/CI/operational evidence, **Planned** for approved future capability, **Blocked** for an unresolved required dependency/gate, and **Unverified** when evidence is missing or indirect.

## Principles

Financial integrity · Inventory integrity · Security by default · Multi-tenant isolation · Offline resilience · Auditability · Idempotency · Server authority.

## Documentation map

- [Engineering status snapshot — 2026-10-15](STATUS-2026-10-15.md): reviewed repository baseline, high-impact open PRs, recorded blockers, and next actions.
- [Production Handbook](PRODUCTION-HANDBOOK.md): architecture, security, database, testing, operations, and release gates.
- [Agent Engineering Skills](engineering-skills/README.md): which evidence-first skill to apply for each change type.
- [Full documentation index](SUMMARY.md).

The repository also contains architecture decisions, auth/RBAC/device-session foundations, database recovery guidance, and agent operating rules. These documents explain the required behavior; they do not replace tests or runtime evidence.

## Evidence and change control

- Record gate results against the exact candidate commit SHA.
- Use **BLOCKED** for unavailable infrastructure/access and **UNVERIFIED** for missing or indirect proof.
- A required gate that is not PASS prevents a Production Ready decision.
- Do not merge, deploy, change production secrets, or perform destructive recovery actions solely because documentation or code CI is green.
