# Database

PostgreSQL is the authoritative transactional store.

## Rules

- UTC authoritative timestamps
- Explicit store/business timezone
- UUID identifiers where defined by the domain foundation
- NUMERIC/DECIMAL for money
- Foreign keys and database constraints for invariants
- Explicit tenant scope
- Versioned migrations
- One authoritative migration head
- Transactions for financial/inventory mutations
- PostgreSQL integration tests before release

Existing M1/M2 database documents remain the detailed implementation records.
