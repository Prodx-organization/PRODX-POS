---
name: prodx-observability
description: Audits PRODX-POS logs, metrics, traces, request correlation, audit events, alerts, and safe diagnostics for production operations.
---

# PRODX-POS Observability Engineering

## Non-negotiable rules
- Use structured logs and stable request/correlation IDs across HTTP, application, database, and provider boundaries where available.
- Diagnostics must be allowlisted and useful without exposing passwords, tokens, DSNs, raw SQL parameters, personal data, or internal hostnames.
- Business audit logs are durable evidence of actions; operational logs are not a substitute for audit trails.
- Define actionable metrics and alerts for readiness failures, auth abuse, payment/refund failures, sync backlog/age, inventory anomalies, database pool pressure, and provider failures as applicable.
- Separate liveness from readiness: liveness reports process health; readiness must verify required dependencies and fail closed when they are unavailable.
- Preserve error classification while preventing sensitive details from reaching clients or logs.
- Avoid high-cardinality or reversible identifiers in metrics/logging.

## Procedure
1. Trace correlation IDs from ingress to logs and responses.
2. Inspect error mapping, safe diagnostic fields, log levels, metric dimensions, alert thresholds, and ownership/runbooks.
3. Test both success and failure paths, including DNS/connectivity, provider rejection, timeout, and malformed responses.
4. Confirm alerts are wired to a real destination and thresholds have operational meaning.
5. Verify dashboards/alerts against current deployment/runtime evidence when claiming production observability.

## Checklist
- [ ] Request IDs correlate response and server logs.
- [ ] No secrets, raw hostnames, sensitive payloads, or unsafe error messages leak.
- [ ] Readiness checks real required dependencies and liveness remains appropriately narrow.
- [ ] Metrics avoid unbounded cardinality and include actionable failure signals.
- [ ] Alerts are configured, tested, and have runbooks/owners.
- [ ] Audit events are durable and independently queryable.

## Evidence contract
Provide representative safe log records, test names, metric/alert configuration, and a verified alert delivery or operational drill. Code that emits a log is not proof that an alert fires. Mark missing runtime wiring **UNVERIFIED** or **BLOCKED**.
