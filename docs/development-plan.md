# CRM — Development Plan

**Framework**: Spec-Driven Development (SDD)  
**Date**: 2026-06-13  
**Status**: Ready to implement — all 12 spec phases complete

---

## Current state

| Layer | Status |
|-------|--------|
| Specs (Phases 0–12) | ✅ Complete |
| Feature specs (8 modules) | Draft — needs `/approve-spec` |
| Project scaffold | ❌ Not run yet |
| Backend code | ❌ Not started |
| Frontend code | ❌ Not started |
| Tests | ❌ Not started |
| Database tables | ❌ Empty (Neon connected ✅) |

---

## Prerequisites (do once before any feature)

```
[ ] 1. Run /scaffold           → creates backend/ and frontend/ project structure
[ ] 2. Set JWT_SECRET          → update backend/.env with a 32+ char secret
[ ] 3. Install backend deps    → cd backend && npm install
[ ] 4. Install frontend deps   → cd frontend && npm install
[ ] 5. Verify DB connection    → mcp__postgres__query: SELECT 1
```

---

## Module dependency graph

```
Auth & User Management   ← foundation — must be first
        │
        ├── Company Management   ← no CRM deps (org only)
        │         │
        │         └── Contact Management   ← optional link to company
        │                   │
        │                   └── Lead Management   ← links to contact + company
        │                             │
        │                             └── Deal & Pipeline   ← converts from lead
        │                                       │
        │                    ┌─────────────────┘
        │                    │
        ├── Activity & Task Tracking   ← links to contact/company/lead/deal
        ├── Notes                      ← links to contact/company/lead/deal
        └── Basic Reports              ← read-only, depends on everything above
```

---

## Implementation sequence

### Milestone 1 — Auth foundation

```
[ ] /approve-spec AuthUserManagement
[ ] /implement-feature AuthUserManagement
[ ] /generate-tests AuthUserManagement
[ ] /review-feature AuthUserManagement
[ ] Manual smoke test: signup → login → JWT issued
```

**DB tables created**: `organizations`, `users`  
**Unblocks**: every other module

---

### Milestone 2 — Core CRM entities

Run in order (each unblocks the next):

```
[ ] /approve-spec CompanyManagement
[ ] /implement-feature CompanyManagement
[ ] /generate-tests CompanyManagement
[ ] /review-feature CompanyManagement

[ ] /approve-spec ContactManagement
[ ] /implement-feature ContactManagement
[ ] /generate-tests ContactManagement
[ ] /review-feature ContactManagement
```

**DB tables created**: `companies`, `contacts`

---

### Milestone 3 — Sales pipeline

```
[ ] /approve-spec LeadManagement
[ ] /implement-feature LeadManagement
[ ] /generate-tests LeadManagement
[ ] /review-feature LeadManagement

[ ] /approve-spec DealPipelineManagement
[ ] /implement-feature DealPipelineManagement
[ ] /generate-tests DealPipelineManagement
[ ] /review-feature DealPipelineManagement
```

**DB tables created**: `leads`, `pipelines`, `pipeline_stages`, `deals`, `deal_stage_history`  
**Key**: Lead → Deal conversion creates FK dependency; migration order matters

---

### Milestone 4 — Activity layer (P0)

```
[ ] /approve-spec ActivityTaskTracking
[ ] /implement-feature ActivityTaskTracking
[ ] /generate-tests ActivityTaskTracking
[ ] /review-feature ActivityTaskTracking
```

**DB tables created**: `activities`

---

### Milestone 5 — P1 features

```
[ ] /approve-spec Notes
[ ] /implement-feature Notes
[ ] /generate-tests Notes
[ ] /review-feature Notes

[ ] /approve-spec BasicReports
[ ] /implement-feature BasicReports
[ ] /generate-tests BasicReports
[ ] /review-feature BasicReports
```

**DB tables created**: `notes` (no new tables for reports)

---

### Milestone 6 — Wrap up

```
[ ] /generate-docs             → API reference + feature summaries + DB schema doc
[ ] Full E2E smoke test        → all 8 modules working end-to-end
[ ] git tag v1.0.0-mvp
```

---

## Per-module checklist (copy for each module)

```
Module: ____________________

Spec phase:
  [ ] /approve-spec {Name}              → feature-spec, db-spec, api-spec = Approved

Implementation phase:
  [ ] /implement-feature {Name}
      [ ] backend: routes, controller, service, repository, schemas
      [ ] frontend: page, components, hooks, api.ts, schemas.ts, types.ts
      [ ] migration SQL file created
      [ ] migration run (mcp__postgres__query or drizzle-kit migrate)
      [ ] tables verified in Neon (mcp__postgres__query: describe table)

Test phase:
  [ ] /generate-tests {Name}
      [ ] unit tests: service.test.ts
      [ ] integration tests: repository.integration.test.ts
      [ ] E2E tests: {name}.spec.ts
      [ ] npm run test:unit — passes
      [ ] npm run test:integration — passes

Review phase:
  [ ] /review-feature {Name}
      [ ] Result = ✅ Approved (not Needs changes, not Blocked)
      [ ] review.md committed
```

---

## Database migration order

Run migrations in this exact sequence to avoid FK constraint errors:

```
1.  organizations          (no deps)
2.  users                  (→ organizations)
3.  companies              (→ organizations)
4.  contacts               (→ organizations, companies nullable)
5.  pipelines              (→ organizations)
6.  pipeline_stages        (→ pipelines)
7.  leads                  (→ organizations, contacts nullable, companies nullable)
8.  deals                  (→ organizations, pipeline_stages, contacts nullable, companies nullable)
9.  ALTER leads ADD COLUMN converted_deal_id → deals   ← circular FK, must be last
10. deal_stage_history     (→ deals, pipeline_stages)
11. activities             (→ organizations; polymorphic: contact/company/lead/deal)
12. notes                  (→ organizations; polymorphic: contact/company/lead/deal)
```

---

## Environment checklist

```
backend/.env
  [✅] DATABASE_URL          — Neon direct connection (for migrations)
  [✅] DATABASE_POOLER_URL   — Neon pooler (for app runtime)
  [ ] JWT_SECRET             — generate: openssl rand -base64 32
  [ ] PORT=3000
  [ ] NODE_ENV=development
  [ ] FRONTEND_URL=http://localhost:5173

frontend/.env
  [ ] VITE_API_URL=http://localhost:3000
```

---

## Commands quick reference

| Command | When to run |
|---------|-------------|
| `/scaffold` | Once, before any feature work |
| `/approve-spec {Name}` | Before implementing a feature |
| `/implement-feature {Name}` | After spec is Approved |
| `/generate-tests {Name}` | After implementation is complete |
| `/review-feature {Name}` | After tests pass |
| `/generate-docs` | After all features are Done |
| `/spec-status` | Anytime — shows pipeline state for all 8 modules |

---

## Risk register

| Risk | Mitigation |
|------|-----------|
| Lead → Deal circular FK | Migration order documented above; ALTER TABLE runs last |
| Neon free tier: 0.5 GB storage | 8 modules of seed data is ~10 MB — well within limit |
| JWT_SECRET not set | `config.ts` throws at startup if missing — fail fast |
| Integration tests pollute DB | `cleanupOrg()` soft-deletes all seeded data after each suite |
| Last-admin guard | BR-01 in auth service; tested in unit tests before integration |
