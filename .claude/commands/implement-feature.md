# Command: /implement-feature

**Usage**: `/implement-feature {FeatureName}`

**Example**: `/implement-feature LeadManagement`

Feature name → kebab slug: `LeadManagement` → `lead-management`

---

## What this command does

Reads the approved spec bundle and generates all application code:
- Backend: Drizzle schema, migration, routes, controller, service, repository, Zod schemas
- Frontend: types, Zod schemas, API client, hooks, components, page
- Route registration: wires the new module into the app

**Pre-condition**: All three specs must be Status: Approved before any code is written.

---

## Step 0 — Pre-flight check

Read these files and verify:

```
specs/features/{feature-slug}/feature-spec.md  → Status must be "Approved"
specs/features/{feature-slug}/db-spec.md        → Status must be "Approved"
specs/features/{feature-slug}/api-spec.md       → Status must be "Approved"
specs/features/{feature-slug}/ui-spec.md        → must exist
specs/api/openapi.yaml                          → must exist
specs/architecture/backend.md                  → must exist
specs/architecture/frontend.md                 → must exist
specs/architecture/security.md                 → must exist
```

If any spec is missing or not Approved, stop immediately:
> "Pre-flight failed: {spec path} has Status: {status}. Set to Approved before running /implement-feature."

---

## Step 1 — Backend Agent: All backend files

**Read these files in order:**
1. `agents/backend-agent.md`
2. `specs/features/{feature-slug}/feature-spec.md`
3. `specs/features/{feature-slug}/db-spec.md`
4. `specs/features/{feature-slug}/api-spec.md`
5. `specs/api/openapi.yaml` (relevant sections)
6. `specs/architecture/backend.md`
7. `specs/architecture/security.md`

**Produce** (all at once — the backend agent owns the full module):
```
backend/src/modules/{feature-slug}/
├── routes.ts
├── controller.ts
├── service.ts
├── repository.ts
└── schemas.ts

backend/src/db/schema/{entity}.ts

backend/drizzle/
└── {YYYYMMDDHHMMSS}_create_{entity}.sql
```

**Backend Agent quality gates** — verify ALL before writing any file:
```
MULTI-TENANCY (CRITICAL — verify first)
[ ] organization_id on EVERY query — no exceptions
[ ] organization_id from JWT only — never from req.body or req.params
[ ] No query can touch records from another tenant

SOFT DELETE (CRITICAL)
[ ] Every SELECT: WHERE deleted_at IS NULL
[ ] Zero DELETE FROM statements — only soft delete via deleted_at = NOW()

UUID KEYS
[ ] All PKs: uuid().defaultRandom() — no serial / integer PKs
[ ] All FK columns: uuid type

LAYER SEPARATION
[ ] routes.ts: register routes, attach schemas, call controller only
[ ] controller.ts: parse request, call service, format response — no logic
[ ] service.ts: business logic + RBAC — no DB queries
[ ] repository.ts: Drizzle queries only — no business logic

BUSINESS RULES
[ ] Every BR-NN from feature-spec.md has a check in service.ts

RESPONSE FORMAT
[ ] Success: { data } or { data, pagination }
[ ] Error: { error, message, details }
[ ] 200 GET, 201 POST create, 200 PUT, 200 soft-delete
[ ] 400 validation, 401 auth, 403 role, 404 not found, 409 conflict, 422 business rule

SECURITY
[ ] JWT preHandler on every protected route
[ ] No secrets / passwords / tokens logged
[ ] No user input in raw SQL strings
```

---

## Step 2 — Frontend Agent: All frontend files

**Read these files in order:**
1. `agents/frontend-agent.md`
2. `specs/features/{feature-slug}/feature-spec.md`
3. `specs/features/{feature-slug}/ui-spec.md`
4. `specs/api/openapi.yaml` (relevant sections)
5. `specs/architecture/frontend.md`
6. `specs/architecture/security.md`

**Produce** (all at once — the frontend agent owns the full module):
```
frontend/src/features/{feature-slug}/
├── pages/
│   └── {EntityName}Page.tsx
├── components/
│   ├── {Entity}Table.tsx
│   ├── {Entity}Form.tsx
│   └── {Entity}Detail.tsx        (if detail page in ui-spec)
├── hooks/
│   ├── use{Entity}s.ts
│   ├── use{Entity}.ts             (if detail page needed)
│   └── use{Entity}Mutations.ts
├── api.ts
├── schemas.ts
└── types.ts
```

**Frontend Agent quality gates** — verify ALL before writing any file:
```
ARCHITECTURE
[ ] No hardcoded API URLs — all via src/lib/api.ts Axios instance
[ ] No direct fetch() calls
[ ] All imports use folder aliases

TYPE SAFETY
[ ] Zero TypeScript `any` types
[ ] All API response shapes match openapi.yaml
[ ] Zod schemas match OpenAPI request body schemas exactly

DATA FETCHING
[ ] Every useQuery: stable queryKey includes all filter params
[ ] Every list query: isLoading → skeleton, isError → error state, empty → empty state
[ ] Every mutation: invalidateQueries on success

FORMS
[ ] All forms: React Hook Form + zodResolver
[ ] Required fields show inline error when submitted empty
[ ] Submit button disabled + spinner while mutation is pending
[ ] Success: close form, toast, invalidate list
[ ] API error 409: inline conflict error (not just a toast)

PERMISSIONS
[ ] Role-restricted elements HIDDEN — never just disabled
[ ] useAuth() for role — no hardcoded role strings in components

STATES
[ ] Every page: loading, empty, error, success states all handled
```

---

## Step 3 — Route registration

Update (append only — do not overwrite existing content):

**Backend** — `backend/src/app.ts`:
```typescript
// Add to the route registration block
fastify.register(import('./modules/{feature-slug}/routes'), { prefix: '/api' })
```

**Frontend** — `frontend/src/router.tsx`:
```typescript
// Add to the route definitions
{ path: '/{route}', element: <ProtectedRoute><{EntityName}Page /></ProtectedRoute> }
```

Read both files first before editing to understand their current structure.

---

## Step 4 — Summary

Print:
```
✅ Implementation complete for: {FeatureName}

Backend files:
  backend/src/modules/{feature-slug}/routes.ts
  backend/src/modules/{feature-slug}/controller.ts
  backend/src/modules/{feature-slug}/service.ts
  backend/src/modules/{feature-slug}/repository.ts
  backend/src/modules/{feature-slug}/schemas.ts
  backend/src/db/schema/{entity}.ts
  backend/drizzle/{timestamp}_create_{entity}.sql

Frontend files:
  frontend/src/features/{feature-slug}/pages/{EntityName}Page.tsx
  frontend/src/features/{feature-slug}/components/...
  frontend/src/features/{feature-slug}/hooks/...
  frontend/src/features/{feature-slug}/api.ts
  frontend/src/features/{feature-slug}/schemas.ts
  frontend/src/features/{feature-slug}/types.ts

Routes registered:
  backend/src/app.ts — ✅ updated
  frontend/src/router.tsx — ✅ updated

Next step: /generate-tests {FeatureName}
```

---

## Rules

- Never write code before all three specs are Approved — stop and report what is missing
- All backend files in `backend/src/modules/{feature-slug}/` — never `backend/src/features/`
- All frontend files in `frontend/src/features/{feature-slug}/`
- Never put business logic in controller.ts — it belongs in service.ts
- Never put DB queries in service.ts — they belong in repository.ts
- Never use DELETE FROM — always set deleted_at = NOW()
- Never read organization_id from req.body or req.params — always from req.user.organizationId (JWT)
- No TypeScript `any` in any generated file
- When updating route registration files, read them first, then append — never overwrite
