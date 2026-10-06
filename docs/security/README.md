# Security

Security is a production gate, not a post-release feature.

## Security domains

- Authentication and session lifecycle
- Authorization/RBAC
- Tenant isolation
- Device trust
- Secret management
- Input validation
- Audit logging
- Lockout/rate limiting where required
- Secure offline synchronization
- Dependency and supply-chain hygiene
- CI security gates

## Non-negotiable rules

- Never persist plaintext session tokens.
- Never commit secrets.
- Never put provider credentials in browser bundles.
- Never trust browser-supplied tenant identity.
- Never use demo credentials in production paths.
- Never weaken a security gate to make CI green.

See [Security Model](security-model.md).
