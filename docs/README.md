# PRODX POS — Production Documentation

**Status:** Production documentation baseline  
**Source of truth:** `Prodx-organization/PRODX-POS`  
**Baseline:** `main` at 2026-10-06

PRODX POS is a production-oriented retail POS platform. This documentation is evidence-driven: a documented capability is not automatically an implemented capability.

{% hint style="warning" %}
Use **Verified** for repository-backed facts, **Planned** for approved future capability, and **Required Evidence** for items that must be demonstrated before Production Ready.
{% endhint %}

## Principles

Financial integrity · Inventory integrity · Security by default · Multi-tenant isolation · Offline resilience · Auditability · Idempotency · Server authority.

## Current foundation

The repository already contains approved architecture, engineering operating model, tenancy, authentication/RBAC/device foundations, authentication enforcement, lockout policy and PostgreSQL recovery documentation. This documentation layer organizes those records into a production documentation system without replacing them.

## Agent engineering skills

The [PRODX-POS Engineering Skill Pack](engineering-skills/README.md) defines reusable, evidence-first procedures for architecture, security, PostgreSQL, financial/inventory integrity, idempotency, offline sync, testing, observability, CI/CD, backup/recovery, and production-readiness decisions.

See [SUMMARY.md](SUMMARY.md) for the complete map.
