# Command: /generate-tests

**Usage**: `/generate-tests {FeatureName}`

**Example**: `/generate-tests LeadManagement`

Feature name → kebab slug: `LeadManagement` → `lead-management`

---

## What this command does

Generates the full test suite for an implemented feature:
- Unit tests (Vitest — service layer, mocked repository)
- Integration tests (Vitest — repository layer, real test DB)
- E2E tests (Playwright — full browser flows)
- Updates the test-spec.md with filled-in test IDs

**Pre-condition**: `/implement-feature {FeatureName}` must have been run first.

---

## Step 0 — Pre-flight check

Verify these files exist:
```
specs/features/{feature-slug}/feature-spec.md     → Status: Approved
specs/features/{feature-slug}/test-spec.md        → must exist
backend/src/modules/{feature-slug}/service.ts     → must exist
backend/src/modules/{feature-slug}/repository.ts  → must exist
```

If any are missing, stop:
> "Pre-flight failed: {file} not found. Run /implement-feature {FeatureName} first."

---

## Step 1 — QA Agent: Unit tests

**Read these files in order:**
1. `agents/qa-agent.md`
2. `specs/features/{feature-slug}/feature-spec.md` (BRs and permissions matrix)
3. `backend/src/modules/{feature-slug}/service.ts`

**Produce**: `backend/src/modules/{feature-slug}/__tests__/{feature-slug}.service.test.ts`

**QA Agent unit test quality gates:**
```
[ ] Every BR-NN from feature-spec.md has at least one unit test
[ ] Both success and error paths tested for every service function
[ ] vi.resetAllMocks() called in beforeEach
[ ] Error types verified: NotFoundError, ConflictError, ForbiddenError
[ ] Arrange → Act → Assert pattern in every test
[ ] Test ID in test description: '{feature}-unit-{NN}: {description}'
```

---

## Step 2 — QA Agent: Integration tests

**Read these files in order:**
1. `agents/qa-agent.md`
2. `specs/features/{feature-slug}/feature-spec.md` (ACs, BRs, permissions matrix)
3. `specs/features/{feature-slug}/api-spec.md`
4. `backend/src/modules/{feature-slug}/repository.ts`

**Produce**: `backend/src/modules/{feature-slug}/__tests__/{feature-slug}.repository.test.ts`

**QA Agent integration test quality gates:**
```
[ ] Multi-tenancy isolation test: org A records not visible to org B
[ ] Soft delete test: record not in list after delete, but still in DB with deleted_at set
[ ] Every permission row tested: ALLOWED (2xx) and DENIED (403)
[ ] afterAll cleans up test data (cleanupOrg)
[ ] No shared mutable state between describe blocks
[ ] Test ID: '{feature}-int-{NN}: {description}'
```

---

## Step 3 — QA Agent: E2E tests

**Read these files in order:**
1. `agents/qa-agent.md`
2. `specs/features/{feature-slug}/feature-spec.md` (every AC must map to a test)
3. `specs/features/{feature-slug}/ui-spec.md`
4. `specs/ui/{page}.md` (for each page referenced in ui-spec)

**Produce**: `e2e/{feature-slug}.spec.ts`

**QA Agent E2E quality gates:**
```
[ ] Every AC-NN has at least one E2E test
[ ] Every permission row tested: allowed AND denied
[ ] Form validation tested: required fields empty → inline error
[ ] API error states tested: error banner/toast shown
[ ] Empty state tested: page shows empty state when no data
[ ] Test ID: '{feature}-e2e-{NN}: {description}'
```

---

## Step 4 — Update test-spec.md

Update `specs/features/{feature-slug}/test-spec.md`:
- Fill in the test IDs in the AC coverage map
- Fill in the test IDs in the BR coverage map
- Fill in the permission coverage table

Read the file first, then update it with the generated test IDs.

---

## Step 5 — Summary

Print:
```
✅ Tests generated for: {FeatureName}

Files produced:
  backend/src/modules/{feature-slug}/__tests__/{feature-slug}.service.test.ts
  backend/src/modules/{feature-slug}/__tests__/{feature-slug}.repository.test.ts
  e2e/{feature-slug}.spec.ts
  specs/features/{feature-slug}/test-spec.md (updated with test IDs)

AC coverage:
  AC-01 ({description}): {feature}-unit-01, {feature}-int-01, {feature}-e2e-01
  AC-02 ({description}): {feature}-int-02, {feature}-e2e-02
  ... (one row per AC)

Uncovered: none / [list AC or BR IDs that could not be tested, with reason]

Run tests:
  npx vitest run --reporter=verbose backend/src/modules/{feature-slug}
  npx playwright test e2e/{feature-slug}.spec.ts

Feature is Done when all three test suites pass with zero failures.
```

---

## Rules

- Every AC must map to at least one E2E test — no exceptions
- Every BR must map to at least one unit or integration test — no exceptions
- Every permission boundary must have both an ALLOWED test and a DENIED test
- Multi-tenancy isolation must be tested for every list endpoint
- Soft delete must be tested: verify record is gone from list AND still in DB
- Test descriptions use the test ID format: `{feature}-{type}-{NN}`
- Fixtures must use helpers (`createTestToken`, `seedOrganization`, `cleanupOrg`) — no inline magic strings
- Test files must be independent — no shared mutable state, no execution-order dependencies
