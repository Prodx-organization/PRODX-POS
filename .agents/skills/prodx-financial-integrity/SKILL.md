---
name: prodx-financial-integrity
description: Use for sale totals, discounts, tax, tenders, payment lifecycle, cash movement, refunds, voids, reconciliation, or ledger changes.
---

# Financial Integrity Engineering

## Trace the complete production flow

Trace request/route -> authorization -> application service/use case -> domain calculations -> repository/transaction -> provider adapter (if applicable) -> audit and response. Identify every external side effect and every retry boundary. A domain function or unit test alone does not prove production wiring.

## Monetary and lifecycle invariants

- Use exact decimal arithmetic and PostgreSQL `NUMERIC`/equivalent exact representations. Do not use binary floating point for money.
- Define and test subtotal, line discounts, order discounts, tax/VAT, rounding mode, total, tendered amount, change, and refund limits.
- Server-side calculations are authoritative; never trust client-supplied totals, prices, tax, permissions, or refundability.
- Sale, inventory effects, payment records, cash movements, and audit events must have explicit atomicity/consistency rules.
- Prevent duplicate financial effects under double-click, request retry, process restart, timeout, and provider callback replay.
- Refunds must not exceed the remaining refundable amount under concurrency.
- Void/refund actions require server-enforced authorization and auditable actor/reason/context.
- Distinguish authorization, capture/settlement, reversal, refund, failure, and reconciliation states; do not imply external settlement occurred when only an internal ledger changed.
- Never fabricate provider IDs, settlement evidence, or successful integration tests.

## Tests required by risk

- Exact boundary/rounding cases and large/small amounts.
- Partial and full refund; refund after prior partial refunds.
- Duplicate request with same idempotency key and conflicting payload.
- Concurrent checkout/refund/void against the same sale/payment.
- Provider timeout after remote success, duplicate callback, and unknown final state.
- Database rollback and audit behavior on failure.
- Integration test through the real HTTP/service/repository path using PostgreSQL and a real provider sandbox where applicable.

## Verification checklist

- [ ] Server recalculates all financial values.
- [ ] Decimal precision and rounding rules are explicit and tested.
- [ ] Payment/refund idempotency binds key to operation and request identity.
- [ ] Concurrent requests cannot double-charge, over-refund, or double-reverse.
- [ ] External provider settlement is demonstrated or its ownership/contract is explicit and verified.
- [ ] Ledger, cash movement, stock effect, and audit event consistency is tested.
- [ ] Failure semantics and reconciliation for ambiguous outcomes are covered.
- [ ] Relevant CI passed on the exact SHA.

## Release rule

Any unexplained monetary drift, duplicate effect, over-refund path, missing authorization, or unproven external settlement is a release blocker. Mark absent integration/runtime evidence **UNVERIFIED**, not PASS.
