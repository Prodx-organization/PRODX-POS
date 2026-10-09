---
name: prodx-security
description: Reviews PRODX-POS authentication, authorization, tenant/store isolation, secrets, session lifecycle, input validation, and security audit controls.
---

# PRODX-POS Security Engineering

## Non-negotiable rules
- Authentication does not imply authorization. Check permissions at the server boundary for every protected operation.
- Derive user, organization, store, device, and session context from trusted server state; never trust caller-supplied scope.
- Preserve password hashing, token/session expiry and revocation, attempt limits, lockout behavior, and secure defaults.
- Use least-privilege database/provider identities. Enforce critical access boundaries in database grants and RLS where applicable.
- Never log, commit, echo, or include credentials, bearer tokens, DSNs, private keys, or raw sensitive provider errors.
- Validate input at boundaries. Avoid mass assignment, privilege escalation, insecure direct object references, and cross-tenant reads/writes.
- Business-critical security events need durable audit evidence with actor/scope/action/outcome when required by policy.

## Review procedure
1. Trace authentication → trusted context → authorization → use case → persistence.
2. Test unauthenticated, unauthorized, expired/revoked, disabled-device, cross-organization, and cross-store cases as applicable.
3. Inspect role grants, RLS policies, secrets handling, logging, rate limits, and failure responses.
4. Test deny-by-default behavior and race-sensitive permission changes.
5. Confirm tests fail if the authorization check is removed or moved to the client.

## Checklist
- [ ] Every protected mutation has server-side authorization.
- [ ] Tenant/store scope is derived from trusted context.
- [ ] Sessions/tokens have expiry, revocation, and lifecycle coverage.
- [ ] Passwords and secrets are never stored or logged in plaintext.
- [ ] Database role is least-privileged and cannot bypass RLS.
- [ ] Security failures do not reveal stack traces, secrets, or internal topology.
- [ ] Relevant security events are audited and attempt limits remain effective.

## Evidence contract
Record exact code paths, migration/policy names, adversarial tests, and exact-head CI results. Mark **FAIL** for demonstrated bypass or secret exposure; **BLOCKED** for unavailable production identity/permission verification; **UNVERIFIED** if only static inspection exists. Do not claim a secret is compromised solely because metadata identifies a readable-secret risk.
