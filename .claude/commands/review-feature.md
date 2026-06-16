# Command: /review-feature

**Usage**: `/review-feature {FeatureName}`

**Example**: `/review-feature LeadManagement`

Feature name → kebab slug: `LeadManagement` → `lead-management`

---

## What this command does

Audits a feature's implementation against its approved specs. Checks spec compliance, security invariants, test coverage, and code quality. Produces a structured review report.

Run this after `/generate-tests` and before merging a feature to main.

---

## Step 0 — Gather all review inputs

Read ALL of these files before beginning any checks:

**Specs (source of truth):**
```
specs/features/{feature-slug}/feature-spec.md   (ACs, BRs, permissions matrix, error cases)
specs/features/{feature-slug}/db-spec.md
specs/features/{feature-slug}/api-spec.md
specs/features/{feature-slug}/ui-spec.md
specs/features/{feature-slug}/test-spec.md
specs/api/openapi.yaml                           (endpoint contracts)
specs/architecture/security.md                  (auth, RBAC, multi-tenancy rules)
specs/architecture/backend.md                   (layer rules)
```

**Implementation (under review):**
```
backend/src/modules/{feature-slug}/routes.ts
backend/src/modules/{feature-slug}/controller.ts
backend/src/modules/{feature-slug}/service.ts
backend/src/modules/{feature-slug}/repository.ts
backend/src/modules/{feature-slug}/schemas.ts
backend/src/db/schema/{entity}.ts
backend/drizzle/{timestamp}_create_{entity}.sql
frontend/src/features/{feature-slug}/pages/{EntityName}Page.tsx
frontend/src/features/{feature-slug}/hooks/use{Entity}Mutations.ts
frontend/src/features/{feature-slug}/api.ts
frontend/src/features/{feature-slug}/schemas.ts
backend/src/modules/{feature-slug}/__tests__/{feature-slug}.service.test.ts
backend/src/modules/{feature-slug}/__tests__/{feature-slug}.repository.test.ts
```

---

## Step 1 — Spec compliance check

### Backend — Controller / Routes

Cross-reference `api-spec.md` against `routes.ts` and `controller.ts`:

- [ ] Every endpoint in api-spec.md is implemented in routes.ts
- [ ] No endpoints exist in routes.ts that are NOT in api-spec.md
- [ ] HTTP methods match (GET/POST/PUT/DELETE)
- [ ] Route paths match exactly
- [ ] Request validation schemas match the api-spec.md request shapes
- [ ] Response shapes match the api-spec.md response shapes (`{ data }` envelope)
- [ ] All error HTTP codes match the api-spec.md error codes

### Backend — Service

Cross-reference `feature-spec.md` Business Rules against `service.ts`:

- [ ] Every BR-NN from feature-spec.md has an enforcing check in service.ts
- [ ] Every error case from the Error Cases section is handled with the correct HTTP status
- [ ] RBAC checks match the Permissions Matrix in feature-spec.md

### Backend — Repository / Schema

Cross-reference `db-spec.md` against `{entity}.ts` (Drizzle schema) and migration SQL:

- [ ] Every field in db-spec.md exists in the Drizzle schema
- [ ] Field types match (UUID, VARCHAR, TIMESTAMPTZ, BOOLEAN, DECIMAL, ENUM)
- [ ] All indexes from db-spec.md are defined
- [ ] Partial unique indexes (e.g. email unique per org, excl. soft-deleted) are correct
- [ ] Soft delete column `deleted_at` is present and nullable

### Frontend — Page / Components

Cross-reference `ui-spec.md` against the page component:

- [ ] Every column listed in ui-spec.md is rendered
- [ ] Every filter from ui-spec.md is implemented
- [ ] Every action (create, edit, delete) from ui-spec.md is present
- [ ] Loading state: skeleton shown while data is fetching
- [ ] Error state: error message + retry shown on API failure
- [ ] Empty state: empty state component shown when list is empty
- [ ] Permissions matrix from ui-spec.md respected (hidden elements for unauthorized roles)

---

## Step 2 — Security invariants check

Read `specs/architecture/security.md` and verify against the implementation:

```
MULTI-TENANCY (blocking — fail if any of these are violated)
[ ] EVERY repository query includes WHERE organization_id = $orgId
[ ] organization_id sourced ONLY from req.user.organizationId (JWT)
[ ] No query anywhere can return records from another org

SOFT DELETE (blocking)
[ ] Zero DELETE FROM statements in any repository file
[ ] Every SELECT includes WHERE deleted_at IS NULL
[ ] Soft delete implemented as: UPDATE SET deleted_at = NOW()

AUTH
[ ] fastify.authenticate preHandler on EVERY protected route
[ ] No protected route reachable without a valid JWT

ROLE CHECKS
[ ] Role checks in service.ts (not route/controller layer)
[ ] Roles match the Permissions Matrix in feature-spec.md
[ ] Admin-only actions throw ForbiddenError for manager/sales_rep

DATA EXPOSURE
[ ] No password_hash in any response
[ ] No invite_token or reset_token in any response
[ ] No sensitive fields logged (check service.ts for logger calls)

INPUT SAFETY
[ ] No raw SQL strings — Drizzle ORM only in repository.ts
[ ] No user input interpolated into query strings
```

---

## Step 3 — Test coverage check

Read `test-spec.md` and cross-reference against the test files:

```
AC COVERAGE
[ ] Every AC-NN from feature-spec.md has at least one unit or integration test
[ ] AC coverage map in test-spec.md is fully filled in (no empty test ID cells)
[ ] No AC marked as untestable without a written explanation

BR COVERAGE
[ ] Every BR-NN from feature-spec.md has at least one unit or integration test
[ ] BR coverage map in test-spec.md is fully filled in

PERMISSION COVERAGE
[ ] Every permission row has an ALLOWED test (2xx)
[ ] Every permission row has a DENIED test (403)
[ ] Permission coverage table in test-spec.md is complete

ISOLATION TESTS
[ ] At least one test verifies org A records are not visible to org B
[ ] This isolation test covers both GET /list and GET /:id endpoints

SOFT DELETE TESTS
[ ] Soft-deleted record does not appear in list endpoint
[ ] Soft-deleted record still exists in DB with deleted_at NOT NULL

```

---

## Step 4 — Code quality check

```
TYPESCRIPT
[ ] Zero `any` types in service.ts, repository.ts, controller.ts
[ ] Zero `any` types in frontend hooks, api.ts, types.ts
[ ] All function parameters and return types explicitly typed

LAYER SEPARATION (backend)
[ ] controller.ts: zero business logic (only parse/call/respond)
[ ] service.ts: zero DB queries (only repository calls)
[ ] repository.ts: zero business logic (only Drizzle queries)
[ ] routes.ts: zero logic (only registration and schema attachment)

FRONTEND PATTERNS
[ ] Zero hardcoded API URLs — all via src/lib/api.ts
[ ] Zero direct fetch() calls
[ ] All role checks via useAuth() — no hardcoded role strings
[ ] Zod schemas in schemas.ts match the api-spec.md request bodies

ERROR HANDLING
[ ] Typed error classes used (NotFoundError, ConflictError, ForbiddenError)
[ ] No untyped `throw new Error('...')` in service.ts
[ ] Fastify error handler maps typed errors to correct HTTP codes

NAMING
[ ] Module folder matches the feature kebab slug
[ ] File names follow the convention: routes.ts, controller.ts, etc.
[ ] Component names are PascalCase; hook names start with `use`
```

---

## Step 5 — Output review report

Produce the review report at `specs/features/{feature-slug}/review.md`:

```markdown
# Feature Review: {FeatureName}

**Reviewed**: {date}
**Result**: ✅ Approved / ⚠️ Needs changes / ❌ Blocked

---

## Spec compliance

### Backend
{list each failed check with: file path, line number, spec reference}
✅ All checks passed / ⚠️ {N} issues found

### Frontend
{same format}
✅ All checks passed / ⚠️ {N} issues found

---

## Security invariants

{For each failed invariant: file path, exact violation description, required fix}
✅ All invariants passed / ❌ BLOCKING: {N} violations found

---

## Test coverage

{List any uncovered ACs, BRs, or permission rows with explanation}
✅ Full coverage / ⚠️ Gaps: {list}

---

## Code quality

{List quality issues with file + line}
✅ All checks passed / ⚠️ {N} issues

---

## Required changes before merge

{Numbered list of blocking issues — or "None — ready to merge"}

1. {Specific change required — file, what to change, which spec it violates}
```

Then print to the user:
```
Review complete for: {FeatureName}
Result: ✅ Approved / ⚠️ Needs changes / ❌ Blocked
Report saved: specs/features/{feature-slug}/review.md

{If issues found}: Fix the issues listed in the report, then re-run /review-feature.
{If approved}:     Feature is ready to merge.
```

---

## Rules

- Every issue must reference the exact file + spec that was violated — no vague complaints
- Any multi-tenancy violation (missing org scoping) is an automatic ❌ Blocked
- Any soft delete violation (DELETE FROM) is an automatic ❌ Blocked
- Any uncovered AC is an automatic ⚠️ Needs changes — cannot be ✅ Approved
- Do not approve a feature with TypeScript `any` in service.ts or repository.ts
- A ✅ Approved result means all checks in all 4 sections passed — no exceptions
