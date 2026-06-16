# Command: /spec-status

**Usage**: `/spec-status`

No arguments. Runs against the entire `specs/features/` directory.

---

## What this command does

Shows the current status of every feature in the pipeline — which specs are approved, which are still draft, which have been implemented, and which have passing tests.

Use this to know exactly where each feature is in the SDD pipeline and what the next action is.

---

## Steps

### Step 1 — Discover all feature folders

List all directories under `specs/features/`. Each directory is a feature.

### Step 2 — Read spec statuses

For each feature folder, read (if they exist):
- `feature-spec.md` → extract Status value from the overview table
- `db-spec.md` → extract Status value
- `api-spec.md` → extract Status value

### Step 3 — Check implementation state

For each feature, check if these paths exist:
- `backend/src/modules/{feature-slug}/service.ts` → backend implemented?
- `frontend/src/features/{feature-slug}/pages/` → frontend implemented?
- `backend/src/modules/{feature-slug}/__tests__/{feature-slug}.service.test.ts` → unit tests?
- `backend/src/modules/{feature-slug}/__tests__/{feature-slug}.repository.test.ts` → integration tests?
- `specs/features/{feature-slug}/review.md` → review done?

### Step 4 — Determine pipeline stage

Map each feature to a pipeline stage:

| Stage | Condition |
|-------|-----------|
| `No specs` | feature folder missing or empty |
| `Draft` | feature-spec exists but Status = Draft |
| `Ready to approve` | all 3 specs exist, Status = Draft, no blockers visible |
| `Approved` | feature-spec + db-spec + api-spec all Status = Approved |
| `Implementing` | Approved, but backend or frontend files not yet present |
| `Implemented` | backend + frontend files exist |
| `Tests written` | unit + integration test files exist |
| `Reviewed` | review.md exists |
| `Done` | review.md exists with Result = ✅ Approved |

### Step 5 — Print the status table

```
📋 Feature Pipeline Status — {date}

Module                     | feature-spec | db-spec  | api-spec | Code | Tests | Review | Stage
---------------------------|-------------|---------|---------|------|-------|--------|-------
auth-user-management       | ✅ Approved  | ✅       | ✅       | ❌   | ❌    | ❌     | Approved
contact-management         | ✅ Approved  | ✅       | ✅       | ❌   | ❌    | ❌     | Approved
company-management         | Draft        | Draft    | Draft    | ❌   | ❌    | ❌     | Draft
lead-management            | ✅ Approved  | ✅       | ✅       | ✅   | ✅    | ✅     | Done
...

Legend:
  ✅ = exists and Approved    ❌ = missing
  Draft = exists but not yet Approved

Next actions:
  /approve-spec ContactManagement         → approve pending specs
  /implement-feature AuthUserManagement   → implement approved feature
  /generate-tests LeadManagement          → generate tests for implemented feature
  /review-feature LeadManagement          → review implemented + tested feature
```

### Step 6 — Print next recommended action

Based on the overall status, print one clear recommendation:

```
Next recommended action:
  {The single highest-priority next step across all features}
  e.g.: "Run /approve-spec AuthUserManagement to unblock implementation"
  e.g.: "Run /implement-feature ContactManagement (specs are approved)"
  e.g.: "All 8 features are Done ✅"
```

---

## Rules

- Read-only — this command never modifies any file
- If a feature folder exists but spec files are missing, show it as `No specs`
- Report the Stage honestly — do not guess at incomplete state
