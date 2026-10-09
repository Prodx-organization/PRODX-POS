---
name: prodx-architecture
description: Enforces PRODX-POS architecture boundaries, dependency direction, production wiring, and evidence-based implementation reviews.
---

# PRODX-POS Architecture Engineering

## Objective
Keep business behavior deterministic, testable, vendor-independent, and wired through the actual production path.

## Non-negotiable rules
- Trace every change through the real path: route/controller → application service/use case → domain → repository/database/provider.
- Domain code must not depend on HTTP, browser APIs/storage, provider SDKs, or concrete persistence.
- Keep external providers behind explicit interfaces/adapters. Do not let controllers, UI, or agents bypass application boundaries.
- Server state is authoritative for identity, authorization, money, inventory, numbering, and final transaction status.
- Prefer the smallest root-cause fix. Do not introduce speculative abstractions or duplicate sources of truth.
- Do not call a feature complete because a class, route, interface, or unit test exists.

## Review procedure
1. Read `AGENTS.md`, relevant architecture docs, and existing conventions.
2. Map the changed behavior from public entry point to persistence/provider.
3. Check dependency direction and identify bypasses or duplicate business rules.
4. Confirm failure paths, transaction boundaries, and authorization context.
5. Verify production composition actually constructs and calls the changed component.
6. Add boundary or integration tests for the highest-risk path.
7. Run applicable architecture, type, test, and build gates on the exact revision.

## Checklist
- [ ] Production entry point wires the implementation.
- [ ] Dependencies point inward; domain logic is deterministic.
- [ ] Persistence and provider details stay behind abstractions.
- [ ] Trusted identity/tenant/store context comes from the server.
- [ ] Failure and rollback paths preserve invariants.
- [ ] Tests exercise the production boundary, not only a mock.
- [ ] No architecture gate was skipped or weakened.

## Evidence contract
- **PASS**: exact source paths and tests/gates prove the production wiring and boundaries.
- **FAIL**: a concrete dependency bypass, invariant violation, or unwired production path is demonstrated.
- **BLOCKED**: required runtime/provider/database evidence cannot be obtained.
- **UNVERIFIED**: the claim is plausible but lacks evidence.

Include commit SHA, source paths, test names/results, and any unverified runtime assumptions. Never infer success from memory or documentation alone.
