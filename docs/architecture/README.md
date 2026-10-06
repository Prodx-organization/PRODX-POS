# Architecture

## Approved direction

- React/TypeScript PWA client
- Node.js/TypeScript backend using NestJS or equivalent modular HTTP architecture
- PostgreSQL authoritative transactional database
- IndexedDB/service-worker offline mechanisms
- Server-owned synchronization protocol
- Hardware-agent boundary for local peripherals
- Redis/queue infrastructure only where an approved capability requires it

See [ADR-001](ADR-001-database-backend-foundation.md) for the accepted database/backend decision gate.

## Dependency rule

`transport -> application -> domain` is allowed. Domain code must not depend directly on HTTP, browser storage, provider SDKs or concrete persistence implementations.

## Authority boundaries

| Concern | Authority |
|---|---|
| Identity | Backend authentication context |
| Authorization | Server policy |
| Money | Server + PostgreSQL numeric |
| Inventory | Server + transactional DB |
| Numbering | Server |
| Final sale/payment state | Server |
| Offline intent | Client outbox |
| Final synchronization result | Server |

## Status vocabulary

**Verified:** demonstrated by repository/CI evidence.  
**Planned:** approved direction not yet proven complete.  
**Blocked:** cannot advance without a required gate or dependency.

