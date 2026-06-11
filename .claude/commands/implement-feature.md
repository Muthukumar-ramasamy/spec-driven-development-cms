# Command: /implement-feature

**Usage**: `/implement-feature {FeatureName}`

**Example**: `/implement-feature LeadManagement`

---

## What this command does

Reads the approved spec bundle for a feature and generates all application code —
backend (controller, service, repository, migration) and frontend (page, components, hooks).

**Pre-condition**: The spec bundle must exist and be approved before running this command.
Check that `specs/features/{feature}/feature-spec.md` exists and has `Status: Approved`.

---

## Steps

### Step 0 — Pre-flight check
Verify these files exist:
- `specs/features/{feature}/feature-spec.md` — Status must be "Approved"
- `specs/features/{feature}/db-spec.md`
- `specs/features/{feature}/api-spec.md`
- `specs/features/{feature}/ui-spec.md`
- `specs/features/{feature}/test-spec.md`

If any are missing or not approved: stop and report what is missing.

### Step 1 — Backend: Database migration
Read: `agents/backend-agent.md`
Read: `specs/features/{feature}/db-spec.md`

Produce:
- `backend/src/database/migrations/{timestamp}_create_{table}.sql`
- `backend/src/database/seeds/{table}.seed.ts`

### Step 2 — Backend: Types and validation
Read: `specs/features/{feature}/db-spec.md`
Read: `specs/features/{feature}/api-spec.md`

Produce:
- `backend/src/features/{feature}/{feature}.types.ts`
- `backend/src/features/{feature}/{feature}.validation.ts`

### Step 3 — Backend: Repository
Read: `agents/backend-agent.md`
Read: `specs/features/{feature}/db-spec.md`
Read: the types file from Step 2

Produce:
- `backend/src/features/{feature}/{feature}.repository.ts`

### Step 4 — Backend: Service
Read: `agents/backend-agent.md`
Read: `specs/features/{feature}/feature-spec.md` (business rules section)
Read: the repository from Step 3

Produce:
- `backend/src/features/{feature}/{feature}.service.ts`

### Step 5 — Backend: Controller + Routes
Read: `agents/backend-agent.md`
Read: `specs/features/{feature}/api-spec.md`
Read: the service from Step 4

Produce:
- `backend/src/features/{feature}/{feature}.controller.ts`
- `backend/src/features/{feature}/{feature}.routes.ts`

### Step 6 — Frontend: Types and API client
Read: `specs/features/{feature}/api-spec.md`

Produce:
- `frontend/src/features/{feature}/types/{feature}.types.ts`
- `frontend/src/features/{feature}/lib/{feature}.api.ts`

### Step 7 — Frontend: Hooks
Read: `agents/frontend-agent.md`
Read: the API client from Step 6

Produce:
- `frontend/src/features/{feature}/hooks/use{Entity}s.ts`
- `frontend/src/features/{feature}/hooks/use{Entity}.ts`
- `frontend/src/features/{feature}/hooks/use{Entity}Mutations.ts`

### Step 8 — Frontend: Components and Page
Read: `agents/frontend-agent.md`
Read: `specs/features/{feature}/ui-spec.md`
Read: the hooks from Step 7

Produce:
- `frontend/src/features/{feature}/components/{Entity}Table.tsx`
- `frontend/src/features/{feature}/components/{Entity}Form.tsx`
- `frontend/src/features/{feature}/pages/{Entity}ListPage.tsx`

### Step 9 — Register routes
Update (do not overwrite):
- `backend/src/app.ts` — register new feature routes
- `frontend/src/router.tsx` — register new page routes

### Step 10 — Summary
```
✅ Implementation complete for: {FeatureName}

Backend files:
  backend/src/features/{feature}/

Frontend files:
  frontend/src/features/{feature}/

Next step: Run /generate-tests {FeatureName}
```

---

## Rules

- Follow the exact layer separation in the Backend Agent definition
- Do not put business logic in controllers
- Do not put SQL in services
- Every file must have TypeScript types — no `any`
- Do not modify files outside the feature folder (except route registration)
