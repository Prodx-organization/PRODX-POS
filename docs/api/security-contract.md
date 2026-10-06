# API Security Contract

```
Request
 -> Transport validation
 -> Authentication
 -> Trusted request context
 -> Authorization
 -> Application use case
 -> Domain invariants
 -> Transaction / persistence
 -> Audit
 -> Response
```

## Prohibited

- trusting caller-supplied user/org/store identity;
- trusting client-calculated totals;
- authorizing from UI state;
- returning secrets;
- unauthenticated protected mutations.

Errors must be safe for clients and useful for operators. Internal stack traces, credentials and sensitive infrastructure details must not leak through public responses.
