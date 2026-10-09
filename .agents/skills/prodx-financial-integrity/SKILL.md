---
name: prodx-financial-integrity
description: Audits PRODX-POS money calculations and the complete sale, payment, settlement, refund, void, tax, rounding, and audit lifecycle.
---

# PRODX-POS Financial Integrity

## Non-negotiable rules
- Keep authoritative money in exact decimal representations and PostgreSQL `NUMERIC/DECIMAL`; do not use binary floating-point for financial arithmetic.
- Define currency precision, rounding mode, rounding point, discount order, VAT/tax basis, and line-vs-order rounding explicitly.
- The server recomputes subtotal, discount, tax, total, payment allocation, and change from trusted catalog and transaction data. Never trust client totals.
- Sale, payment, and stock effects must be atomic or linked by an explicit recoverable state machine.
- Duplicate submit, retry, webhook, timeout, and concurrent request must not create duplicate financial effects.
- Refund amount and quantity cannot exceed the eligible captured/settled amount or refundable items, including under concurrency.
- Void and refund require the appropriate authorization and durable audit trail. Do not erase or rewrite historical financial events.
- External payment provider success/failure/unknown states must be reconciled; a timeout is not proof that a charge failed.

## Procedure
1. Trace checkout through pricing, tax, payment, ledger/persistence, receipt, and response.
2. Verify decimal semantics and rounding with boundary values and multiple currencies if supported.
3. Exercise duplicate requests, concurrent checkout, partial payment failure, provider timeout, refund races, void authorization, and retry/reconciliation.
4. Check database constraints and idempotency keys, not only in-memory guards.
5. Reconcile persisted totals and payment/ledger records after failure and retry.

## Checklist
- [ ] Subtotal, discount, VAT, total, tender, change, refund, and void use deterministic exact arithmetic.
- [ ] Rounding rules are documented and tested at edge cases.
- [ ] Server recomputes financial values from authoritative data.
- [ ] Financial mutations are transactional and durable.
- [ ] Duplicate and concurrent operations have exactly-once effect.
- [ ] Refund bounds and manager authorization are enforced.
- [ ] Audit/ledger history is append-only or protected from mutation.
- [ ] Integration tests verify persisted rows and balances after failures.

## Evidence contract
PASS requires named tests and database evidence on the exact revision. If an external payment provider is not configured or settlement/reconciliation cannot be exercised, mark that gate **BLOCKED** or **UNVERIFIED**. Unit tests alone cannot prove settlement correctness. Never report financial readiness from UI screenshots or mocked provider responses.
