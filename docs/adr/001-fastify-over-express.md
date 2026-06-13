# ADR-001: Use Fastify over Express

## Status: Accepted

## Context
We need a Node.js HTTP framework for the CRM API. The two mainstream TypeScript-friendly options are Express and Fastify.

## Decision
Use Fastify v4.

## Consequences
**Easier:** Schema-first route definitions, built-in Zod/JSON Schema validation, better TypeScript inference, faster request throughput, structured plugin system.

**Harder:** Smaller ecosystem than Express; some middleware packages (passport, etc.) are Express-only — but we are not using those in MVP.
