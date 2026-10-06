# Testing & Quality Gates

## Required layers

1. Static/type checks
2. Unit tests
3. PostgreSQL integration tests
4. Architecture contract tests
5. Migration validation
6. Security tests
7. Critical end-to-end tests
8. Independent review
9. Main-branch verification

A skipped test is not equivalent to a passing test. Required infrastructure must be provisioned in CI or the gate remains unresolved.
