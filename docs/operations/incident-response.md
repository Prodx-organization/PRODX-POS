# Incident Response

## Severity

- **SEV-1:** financial integrity, cross-tenant access, data loss or widespread checkout outage
- **SEV-2:** major store capability degraded with workaround
- **SEV-3:** limited feature degradation
- **SEV-4:** non-production/documentation issue

## Response

1. Detect and acknowledge.
2. Protect customer/store data and financial state.
3. Establish scope and timeline.
4. Preserve logs/evidence.
5. Mitigate without bypassing authority boundaries.
6. Restore service.
7. Verify financial/inventory consistency.
8. Record root cause and corrective action.

Never directly edit authoritative financial/inventory records to hide an incident. Use controlled compensating transactions or approved repair procedures with audit evidence.
