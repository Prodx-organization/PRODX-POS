# PRODX AI Provider Boundary

This directory contains the server-side, provider-neutral AI boundary for PRODX.

## Provider policy

PRODX application AI is provider-independent. External providers are optional adapters behind the PRODX AI Gateway and must never be coupled directly to browser code.

Provider credentials belong in the deployment secret manager and must never be committed or bundled into the browser.

The engineering review lane may use an approved external provider, but that provider choice is an implementation detail of the engineering lane and is not part of the application-facing PRODX AI contract.

## Request flow

PRODX frontend -> authenticated backend AI route -> AI Gateway -> approved provider/model adapter -> audit

The application boundary enforces authorization, rate limits, quota policy, audit logging, tenant/store scope, and data-redaction rules before an AI request leaves PRODX.

## Verification

Provider tests use mocked implementations and never require a real provider API key.

Run the standard verification checks before changing the provider boundary:

```bash
npm run lint
npm run server:check
npm run server:test
npm run build
```
