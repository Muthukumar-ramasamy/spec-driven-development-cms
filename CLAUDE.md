# CRM — Spec-Driven Development Project

This is a learning project to prove the Spec-Driven Development (SDD) framework. The CRM is the sample application. The goal is: given any feature requirement, the framework generates specs, architecture, code, and tests with minimal manual intervention.

**Success criterion**: Every module was implemented from an approved spec — zero "code first" exceptions.

---

## SDD Pipeline (non-negotiable order)

```
Requirement
    ↓
/create-feature {Name}     → specs/features/{feature}/feature-spec.md (Draft)
                                                      db-spec.md       (Draft)
                                                      api-spec.md      (Draft)
                                                      ui-spec.md       (Draft)
                                                      test-spec.md     (Draft)
    ↓
/approve-spec {Name}        → sets Status: Approved on feature-spec, db-spec, api-spec
    ↓
/implement-feature {Name}  → backend/src/modules/{feature}/ (routes, controller, service, repo, schemas)
                           → backend/src/db/schema/{entity}.ts
                           → backend/drizzle/{timestamp}_create_{entity}.sql
                           → frontend/src/features/{feature}/ (page, components, hooks, api, schemas, types)
    ↓
/generate-tests {Name}     → backend/src/modules/{feature}/__tests__/ (unit + integration)
                           → e2e/{feature}.spec.ts
    ↓
/review-feature {Name}     → specs/features/{feature}/review.md
```

**Never skip a step.** No code before an Approved spec. No tests before an implemented feature.

---

## Slash commands

| Command | What it does |
|---------|-------------|
| `/spec-status` | Show pipeline stage for all 8 features |
| `/create-feature {Name}` | Run Product + Architect agents → spec bundle |
| `/approve-spec {Name}` | Check completeness + set Status: Approved |
| `/scaffold` | Create backend/ and frontend/ project structure (run once) |
| `/implement-feature {Name}` | Run Backend + Frontend agents → all code |
| `/generate-tests {Name}` | Run QA agent → unit + integration + E2E tests |
| `/review-feature {Name}` | Audit implementation against specs → review.md |

---

## Non-negotiable invariants (all agents enforce these)

1. **No code before an Approved spec** — any agent asked to generate code without an Approved spec must refuse
2. **No hard deletes** — every delete sets `deleted_at = NOW()` — never `DELETE FROM`
3. **Every query scoped by `organization_id`** — no cross-tenant data access, ever
4. **UUIDs for all PKs and FKs** — no auto-increment integers
5. **organization_id from JWT only** — never from `req.body` or `req.params`
6. **Standard response envelope** — `{ data }` or `{ data, pagination }` for success; `{ error, message, details }` for errors
7. **Role-restricted UI elements are hidden** — never just disabled

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TanStack Query v5, React Hook Form, Zod, shadcn/ui, Tailwind CSS |
| Backend | Fastify v4, TypeScript, Drizzle ORM, Zod |
| Database | Neon (PostgreSQL serverless) |
| Auth | JWT (24h TTL, localStorage — ADR-003) |
| Testing | Vitest (unit + integration), Playwright (E2E) |

---

## Project structure

```
specs/
  product/         — domain analysis, PRD
  architecture/    — system context, frontend, backend, security specs
  database/        — schema.md, erd.md, entity specs
  api/             — openapi.yaml (38 endpoints)
  ui/              — 12 page-level UI specs
  features/        — 8 feature bundles (one per module)
  templates/       — feature-spec, db-spec, api-spec, ui-spec, test-spec templates

agents/
  README.md        — pipeline overview + non-negotiable rules
  product-agent.md
  architect-agent.md
  frontend-agent.md
  backend-agent.md
  qa-agent.md

.claude/commands/  — 6 slash commands

backend/src/       — Fastify app (created by /scaffold)
  modules/         — one subfolder per feature
  db/schema/       — Drizzle entity definitions

frontend/src/      — React app (created by /scaffold)
  features/        — one subfolder per feature

e2e/               — Playwright tests

docs/adr/          — Architecture Decision Records (ADR-001 through ADR-004)
```

---

## 8 MVP modules (Phase 8 specs complete)

| # | Module | Folder | Priority |
|---|--------|--------|----------|
| 1 | Auth & User Management | auth-user-management | P0 |
| 2 | Contact Management | contact-management | P0 |
| 3 | Company Management | company-management | P0 |
| 4 | Lead Management | lead-management | P0 |
| 5 | Deal & Pipeline Management | deal-pipeline-management | P0 |
| 6 | Activity & Task Tracking | activity-task-tracking | P0 |
| 7 | Notes | notes | P1 |
| 8 | Basic Reports | basic-reports | P1 |

All 8 feature bundles exist in `specs/features/` with Status: Draft.
Run `/approve-spec {Name}` on each one before `/implement-feature`.

---

## Implementation order (suggested)

1. `/scaffold` — create project structure
2. `/approve-spec AuthUserManagement` → `/implement-feature AuthUserManagement`
3. `/approve-spec ContactManagement` → `/implement-feature ContactManagement`
4. `/approve-spec CompanyManagement` → `/implement-feature CompanyManagement`
5. `/approve-spec LeadManagement` → `/implement-feature LeadManagement`
6. `/approve-spec DealPipelineManagement` → `/implement-feature DealPipelineManagement`
7. `/approve-spec ActivityTaskTracking` → `/implement-feature ActivityTaskTracking`
8. `/approve-spec Notes` → `/implement-feature Notes`
9. `/approve-spec BasicReports` → `/implement-feature BasicReports`

For each module: implement → generate-tests → review-feature before moving on.

---

## Key architecture decisions

| ADR | Decision |
|-----|----------|
| ADR-001 | Fastify over Express |
| ADR-002 | Drizzle ORM over Prisma |
| ADR-003 | localStorage JWT (24h TTL) for MVP |
| ADR-004 | Row-level multi-tenancy (organization_id on every table) |

Full ADRs in `docs/adr/`.
