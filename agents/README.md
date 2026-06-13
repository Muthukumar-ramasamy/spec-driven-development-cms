# Agent Pipeline — Overview

> **Phase**: 7 — AI Agents Definition
> **Created**: 2026-06-13

This directory contains the 5 Claude agent definitions that power the Spec-Driven Development pipeline. Each agent has a single responsibility, reads specific input files, produces specific output files, and must pass quality gates before handing off to the next agent.

---

## Pipeline Sequence

```
Business requirement
        │
        ▼
┌───────────────────┐
│  Product Agent    │  Reads: requirement (natural language)
│                   │  Writes: feature-spec.md
│  GATE: spec must  │  ────────────────────────────────────
│  be Approved      │  Human review required before next step
└────────┬──────────┘
         │ approved feature-spec.md
         ▼
┌───────────────────┐
│  Architect Agent  │  Reads: feature-spec.md, schema.md, openapi.yaml
│                   │  Writes: db-spec.md, api-spec.md, openapi patch
│  GATE: no broken  │  ────────────────────────────────────
│  FKs, org-scoped  │  Human review required before next step
└────────┬──────────┘
         │ approved db-spec.md + api-spec.md
         ▼
┌─────────────────────────────────────┐
│  Backend Agent        Frontend Agent │  (run in parallel)
│                                     │
│  Reads: api-spec,     Reads: ui-spec,│
│  db-spec, feature-    openapi.yaml, │
│  spec (BRs)           security.md   │
│                                     │
│  Writes: controller,  Writes: pages,│
│  service, repo,       hooks, forms, │
│  migration, Zod       types         │
└───────────────┬─────────────────────┘
                │ both complete
                ▼
┌───────────────────┐
│   QA Agent        │  Reads: feature-spec (ACs + BRs), test-spec,
│                   │         source files (for unit tests)
│  GATE: every AC   │  Writes: unit tests, integration tests, E2E tests
│  and BR has a     │  ────────────────────────────────────
│  test             │  Tests must pass before feature is Done
└───────────────────┘
```

---

## Agent Index

| Agent | File | Invoked by | Produces |
|-------|------|-----------|---------|
| Product Agent | `product-agent.md` | `/create-feature` | `feature-spec.md` |
| Architect Agent | `architect-agent.md` | `/create-feature` (phase 2) | `db-spec.md`, `api-spec.md`, OpenAPI patch |
| Backend Agent | `backend-agent.md` | `/implement-feature` | controllers, services, repos, migrations |
| Frontend Agent | `frontend-agent.md` | `/implement-feature` | pages, hooks, forms, types |
| QA Agent | `qa-agent.md` | `/generate-tests` | unit, integration, E2E tests |

---

## Approval Gates

Before any agent hands off to the next, the output must be manually reviewed and the spec status updated:

```
Status: Draft      → agent just produced the output
Status: Review     → human is reviewing
Status: Approved   → human approved, next agent can proceed
Status: Rejected   → human found issues, agent must revise
```

**The backend and frontend agents must REFUSE to run if the feature spec status is not `Approved`.**

---

## Shared Context (all agents read these)

All agents are aware of these project-wide documents:

| Document | Purpose |
|----------|---------|
| `specs/database/schema.md` | Entity registry — avoid conflicts |
| `specs/api/openapi.yaml` | API contract — never contradict this |
| `specs/architecture/security.md` | Auth + RBAC rules |
| `specs/architecture/backend.md` | Layered architecture rules |
| `specs/architecture/frontend.md` | Frontend conventions |
| `agents/README.md` | This file — pipeline rules |

---

## Non-Negotiable Rules (all agents enforce)

1. **No code before an Approved spec** — any agent asked to generate code without an Approved spec must refuse and say which spec is missing.
2. **No hard deletes** — every DELETE operation sets `deleted_at`, never `DELETE FROM`.
3. **Every query scoped by `organization_id`** — no cross-tenant data access.
4. **UUIDs for all PKs and FKs** — no auto-increment integers.
5. **Standard error envelope** — `{ error, message, details }` for all errors.
6. **Standard response envelope** — `{ data }` or `{ data, pagination }` for all success responses.
