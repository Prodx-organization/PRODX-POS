# PRODX-POS Production-Ready Migration Plan

## Objectives
1.  Migrate authoritative POS state from Firestore to PostgreSQL (Cloud SQL).
2.  Enforce strict separation between the Admin Console and the POS login flow.
3.  Establish enterprise-grade security and RBAC.
4.  Ensure 100% production readiness (financial/inventory integrity, idempotency, auditability).

## Phase 1: Infrastructure & Database Migration
- [ ] Provision Cloud SQL (PostgreSQL).
- [ ] Define PostgreSQL schema based on domain entities (Org, Branch, Terminal, User, Transaction, Inventory).
- [ ] Implement data migration pipeline from Firestore to PostgreSQL (with audit logging).
- [ ] Update `src/db/schema.ts` and `src/db/drizzle.config.ts`.
- [ ] Perform integration testing on PostgreSQL.

## Phase 2: Authentication & Authorization Separation
- [ ] Separate Admin authentication (OAuth/Firebase Auth) from POS authentication (User/PIN-based).
- [ ] Implement strict RBAC enforcement on the backend.
- [ ] Create distinct UI flows for Admin Console and POS.

## Phase 3: Financial & Inventory Integrity
- [ ] Replace floating-point arithmetic with NUMERIC types for monetary calculations.
- [ ] Implement atomic transaction boundaries for financial operations.
- [ ] Build idempotent inventory management services.
- [ ] Establish auditable transaction logs.

## Phase 4: Verification & Audit
- [ ] Implement automated regression tests (Unit, Integration, E2E).
- [ ] Run security, architecture, and lint gates.
- [ ] Finalize observability and audit events.
