# Product & Scope

## Mission

PRODX POS is a production retail POS platform designed to preserve correctness across sales, payments, inventory, cash, refunds, voids, shifts, users, devices, audit records and offline operation.

## Core domains

1. Organization and store tenancy
2. Identity, authentication, sessions and devices
3. Roles and permissions
4. Catalog and pricing
5. Inventory and stock movements
6. Sales and checkout
7. Payments and cash operations
8. Refunds and voids
9. Audit and observability
10. Offline outbox and synchronization
11. Hardware integration
12. Deployment and recovery

## Authority

The browser/PWA is a client. The backend is authoritative for identity, authorization, monetary results, inventory state, document numbering and final transaction state.

## Delivery model

Capabilities are delivered as independently verifiable milestones. A UI, unit test or successful build alone does not establish production readiness. The complete server boundary, persistence, concurrency, security, auditability, integration testing and operational evidence must be verified for the capability.
