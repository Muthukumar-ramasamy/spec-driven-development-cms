# ADR-004: Row-level multi-tenancy via organization_id

## Status: Accepted

## Context
The CRM must isolate data between organisations (tenants). The main patterns are:
1. **Separate database per tenant** — strongest isolation, operationally expensive
2. **Separate schema per tenant** — strong isolation, complex migrations
3. **Shared schema, row-level isolation** — `organization_id` column on every table, filtered in every query

## Decision
Use shared schema, row-level isolation. Every table has an `organization_id` column. Every repository query includes `WHERE organization_id = :organizationId`. The `organizationId` is always sourced from the verified JWT — never from the request payload.

## Consequences
**Easier:** Single database, single schema, simple migrations, simpler Drizzle setup.

**Harder:** A missing `WHERE organization_id` clause in a repository is a data leak. This is mitigated by: (a) the repository-only SQL rule (no SQL outside repositories), (b) code review checks, (c) integration tests that assert cross-tenant isolation.
