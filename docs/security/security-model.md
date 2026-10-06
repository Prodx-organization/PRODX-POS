# Security Model

## Threat boundary

The client is untrusted. Requests may be modified, replayed, reordered or duplicated.

The server must derive authenticated user, organization, store, device/session state and effective permissions from trusted server-side state.

## Credentials

Secrets remain in managed secret stores/configuration. Session tokens are not persisted in plaintext. Provider credentials remain server-side.

## Authorization

Authentication does not imply authorization. Policies are deterministic, explicit and tenant-scoped. Wildcard permission behavior is not assumed.

## Audit

Security-sensitive events should record actor, tenant/store context, action, target, timestamp, request/correlation identifier and outcome appropriate to the event.

## Required evidence

A production release requires current evidence for authentication, authorization, tenant-isolation tests, secret hygiene, dependency/security checks and critical audit behavior.
