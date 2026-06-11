# Command: /review-feature

**Usage**: `/review-feature {FeatureName}`

**Example**: `/review-feature LeadManagement`

---

## What this command does

Reviews the implementation of a feature against its spec. Checks for spec compliance, code quality, missing test coverage, and security issues. Produces a review report.

---

## Steps

### Step 1 — Spec compliance check
For each implemented file, verify it matches its spec:

**Backend controller**:
- [ ] All endpoints in `api-spec.md` are implemented
- [ ] No endpoints exist that are NOT in `api-spec.md`
- [ ] Request validation matches the spec
- [ ] Response shape matches the spec
- [ ] Error codes match the spec

**Backend service**:
- [ ] All business rules from `feature-spec.md` are enforced
- [ ] All error cases from `feature-spec.md` are handled

**Database**:
- [ ] All fields from `db-spec.md` exist in the migration
- [ ] All indexes from `db-spec.md` exist in the migration
- [ ] Soft delete is implemented correctly

**Frontend page**:
- [ ] All columns from `ui-spec.md` are rendered
- [ ] All filters from `ui-spec.md` are implemented
- [ ] All actions from `ui-spec.md` are present
- [ ] Permission matrix is respected (hidden elements for unauthorized roles)
- [ ] Loading, error, and empty states are handled

### Step 2 — Security check
- [ ] All routes require auth middleware
- [ ] RBAC is enforced (role checks on protected actions)
- [ ] All DB queries are scoped by `organization_id`
- [ ] No raw SQL strings
- [ ] No sensitive data in logs
- [ ] Input validation on all endpoints

### Step 3 — Test coverage check
- [ ] Every AC has a corresponding E2E test
- [ ] Every business rule has a unit or integration test
- [ ] Every error case has a negative test
- [ ] Permission denied cases are tested

### Step 4 — Code quality check
- [ ] No `any` TypeScript types
- [ ] No business logic in controllers
- [ ] No SQL in services
- [ ] Consistent error handling (typed errors, not raw `throw new Error()`)
- [ ] No hardcoded values (use constants or env vars)

### Step 5 — Output review report

```markdown
# Feature Review: {FeatureName}

## Result: ✅ Approved / ⚠️ Needs changes / ❌ Blocked

## Spec compliance
{list of issues or "✅ All checks passed"}

## Security
{list of issues or "✅ All checks passed"}

## Test coverage
{list of uncovered ACs or "✅ All ACs covered"}

## Code quality
{list of issues or "✅ All checks passed"}

## Required changes before merge
{numbered list or "None — ready to merge"}
```

---

## Rules

- Be specific — reference the exact file, line, and spec requirement for every issue
- Do not approve a feature with uncovered acceptance criteria
- Do not approve a feature with missing `organization_id` scoping
- Do not approve a feature with untyped `any` in the service or repository layer
