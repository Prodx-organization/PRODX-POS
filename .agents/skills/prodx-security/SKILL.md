---
name: prodx-security
description: Use for login, credential lifecycle, sessions/tokens, permissions, staff PIN, WebAuthn, tenant/store isolation, secrets, or security-sensitive API changes.
---

# Security Production Engineering

## Required workflow

1. Trace identity from credential verification to session issuance, request authentication, authorization, revocation, and audit.
2. Identify trust boundaries: browser/device, HTTP edge, application service, database, external identity/provider, and background/offline commands.
3. Verify production routes call the intended middleware/service and fail closed on missing/invalid identity or policy.
4. Add negative-path tests and database-backed tests for tenant/store isolation and revocation.
5. Run applicable auth/security, architecture, dependency, lint/typecheck, and build gates; cite exact SHA and results.

## Invariants

- Authentication establishes identity; authorization is checked server-side for every protected operation.
- Enforce least privilege and tenant/organization/store isolation in query predicates and database relationships, not only in UI filtering.
- Never trust client role, permission, price, supervisor approval, store identity, or local PIN as authoritative.
- Passwords/PINs must use appropriate password hashing and attempt/rate limits; never store or log plaintext credentials.
- Tokens/sessions need documented expiry, rotation/revocation, replay controls, and secure transport/storage. Prefer HttpOnly, Secure, SameSite cookies when appropriate; document and test any justified alternative.
- Privileged actions (refund, void, inventory adjustment, credential changes) require explicit policy checks and audit records.
- WebAuthn/2FA must be server-authoritative; absent challenge/verification endpoints cannot be represented as implemented.
- Secrets belong in managed secret storage, not source, logs, fixtures, or client bundles.
- Offline commands must be re-authorized and scope-validated on the server when replayed.

## Negative-path checklist

- [ ] Missing, malformed, expired, revoked, or replayed session.
- [ ] Unauthorized permission and role escalation attempts.
- [ ] Cross-organization/store identifier substitution.
- [ ] Brute-force/credential-stuffing attempt limits.
- [ ] CSRF/CORS/cookie behavior where applicable.
- [ ] Supervisor token reuse, wrong scope, wrong action, and expiry.
- [ ] Secret/credential/token redaction in errors and logs.
- [ ] Offline replay after permission revocation or store reassignment.
- [ ] Audit records for successful and rejected security-critical actions.

## Reporting

Separate **implemented**, **wired**, **tested**, and **runtime-verified**. PASS requires relevant code plus executable tests/CI and live/runtime evidence where the claim depends on deployed configuration. A disabled UI button is not authorization. Never weaken checks to make tests pass.
