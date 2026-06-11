# Command: /generate-tests

**Usage**: `/generate-tests {FeatureName}`

**Example**: `/generate-tests LeadManagement`

---

## What this command does

Generates the full test suite for an implemented feature — unit tests, integration tests, and E2E tests. Maps every acceptance criterion to at least one test case.

**Pre-condition**: `/implement-feature {FeatureName}` must have been run first.

---

## Steps

### Step 0 — Pre-flight check
Verify these files exist:
- `specs/features/{feature}/feature-spec.md`
- `specs/features/{feature}/test-spec.md`
- `backend/src/features/{feature}/{feature}.service.ts`
- `backend/src/features/{feature}/{feature}.controller.ts`
- `frontend/src/features/{feature}/pages/`

### Step 1 — Test fixtures
Read: `agents/qa-agent.md`
Read: `specs/features/{feature}/feature-spec.md`

Produce:
- `tests/fixtures/{feature}.fixtures.ts`

### Step 2 — Unit tests
Read: `agents/qa-agent.md`
Read: `specs/features/{feature}/test-spec.md` (unit test section)
Read: `backend/src/features/{feature}/{feature}.service.ts`

Produce:
- `tests/unit/{feature}/{Entity}Service.test.ts`

### Step 3 — Integration tests
Read: `agents/qa-agent.md`
Read: `specs/features/{feature}/test-spec.md` (integration test section)
Read: `specs/features/{feature}/api-spec.md`

Produce:
- `tests/integration/{feature}/{feature}.api.test.ts`

### Step 4 — E2E tests
Read: `agents/qa-agent.md`
Read: `specs/features/{feature}/feature-spec.md` (acceptance criteria — each AC becomes a test)
Read: `specs/features/{feature}/ui-spec.md`

Produce:
- `tests/e2e/{feature}/{feature}.spec.ts`

### Step 5 — Coverage report
Print:

```
✅ Tests generated for: {FeatureName}

Coverage map:
  AC-01: ✅ E2E  ✅ Integration  ✅ Unit
  AC-02: ✅ E2E  ✅ Integration  ❌ Unit (no service logic)
  AC-03: ✅ E2E  ❌ Integration  ✅ Unit

Uncovered ACs: none / [list if any]

Run tests:
  npm run test:unit -- {feature}
  npm run test:integration -- {feature}
  npm run test:e2e -- {feature}
```

---

## Rules

- Every acceptance criterion must map to at least one E2E test
- Every business rule must map to at least one unit or integration test
- Every error case must have a negative test
- Use `tests/fixtures/` for all test data — no inline magic strings
- Test descriptions must use the AC identifier: `'AC-01: {description}'`
