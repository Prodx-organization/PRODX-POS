# Hardware Agent

The local agent communicates with supported peripherals without moving business authority into the device layer.

## Rules

- Business decisions remain server/application decisions.
- Hardware commands are explicit and safely retryable.
- Device failures must not corrupt sale/payment state.
- Local configuration and credentials are protected.
- Supported device profiles are versioned and tested.

A printer/drawer failure is an operational failure, not permission to mutate authoritative transaction state incorrectly.
