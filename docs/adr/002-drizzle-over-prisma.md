# ADR-002: Use Drizzle ORM over Prisma

## Status: Accepted

## Context
We need a TypeScript ORM for PostgreSQL. The two most popular options are Prisma and Drizzle.

## Decision
Use Drizzle ORM.

## Consequences
**Easier:** No code generation step, SQL-close queries (easier to reason about), works natively with Neon's serverless HTTP driver, lighter runtime bundle, schema defined in TypeScript (no `.prisma` DSL to learn).

**Harder:** Less documentation and community examples than Prisma; no Prisma Studio GUI for browsing data. Migrations are managed via `drizzle-kit` rather than Prisma Migrate.
