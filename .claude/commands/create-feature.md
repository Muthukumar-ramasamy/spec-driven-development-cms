# Command: /create-feature

**Usage**: `/create-feature {FeatureName}`

**Example**: `/create-feature LeadManagement`

The feature name maps to a kebab-case folder slug:
- `LeadManagement` → `lead-management`
- `DealPipelineManagement` → `deal-pipeline-management`
- `AuthUserManagement` → `auth-user-management`

---

## What this command does

Creates the complete spec bundle for a CRM feature by running the Product Agent and then the Architect Agent in sequence.

**Output**: 5 spec files in `specs/features/{feature-slug}/`
**Does NOT**: generate any application code — that is `/implement-feature`

---

## Step 0 — Pre-flight check

Before doing anything, verify:

1. `specs/product/prd.md` exists
2. `specs/product/crm-domain-analysis.md` exists
3. `specs/database/schema.md` exists
4. `specs/api/openapi.yaml` exists
5. `specs/templates/feature-spec.md` exists
6. `specs/templates/db-spec.md` exists
7. `specs/templates/api-spec.md` exists
8. `specs/templates/ui-spec.md` exists
9. `specs/templates/test-spec.md` exists

If any are missing, stop and report:
> "Pre-flight failed: {file} is missing. Complete Phase {N} before running /create-feature."

If `specs/features/{feature-slug}/` already exists:
> "Feature folder already exists at specs/features/{feature-slug}/. Run /review-feature {FeatureName} to check its current status, or delete the folder to start fresh."

Then stop.

---

## Step 1 — Product Agent: Feature spec

**Read these files in order:**
1. `agents/product-agent.md`
2. `specs/product/prd.md`
3. `specs/product/crm-domain-analysis.md`
4. `specs/database/schema.md`
5. `specs/templates/feature-spec.md`

**Produce**: `specs/features/{feature-slug}/feature-spec.md`

The spec must be fully completed — all 14 sections filled, no `{placeholder}` text remaining.

**Product Agent quality gates** (self-check before writing the file):
```
[ ] All 14 template sections present and filled
[ ] No {placeholder} text remains
[ ] Status is set to Draft
[ ] Every user story uses: As a {role}, I want to {action}, so that {outcome}
[ ] Role is one of: Admin, Manager, Sales Rep — no others
[ ] Every AC uses: Given / When / Then format
[ ] Every AC is independently testable
[ ] ACs are numbered: AC-01, AC-02, ...
[ ] BRs are numbered: BR-01, BR-02, ...
[ ] Permissions matrix covers all 3 roles
[ ] At least one explicit out-of-scope item listed
[ ] No code, DB field names, or API paths in the spec
```

---

## Step 2 — Architect Agent: DB spec + API spec

**Read these files in order:**
1. `agents/architect-agent.md`
2. `specs/features/{feature-slug}/feature-spec.md` ← just created
3. `specs/database/schema.md`
4. `specs/database/erd.md`
5. `specs/api/openapi.yaml`
6. `specs/architecture/backend.md`
7. `specs/architecture/security.md`
8. `specs/templates/db-spec.md`
9. `specs/templates/api-spec.md`

**Produce**:
- `specs/features/{feature-slug}/db-spec.md`
- `specs/features/{feature-slug}/api-spec.md`

**Architect Agent quality gates** (self-check before writing files):
```
[ ] Every new entity has: id (UUID PK), organization_id, created_at, updated_at, deleted_at
[ ] No auto-increment integers — UUIDs only
[ ] Every FK column has an index
[ ] Soft delete only — deleted_at, never DELETE FROM
[ ] Every endpoint in api-spec.md requires Bearer JWT (unless public auth endpoints)
[ ] Every list endpoint has: page, limit, sort, order, search params
[ ] Every response uses standard envelope: { data } or { data, pagination }
[ ] Every endpoint has 401 response defined
[ ] No broken $ref references in OpenAPI patch
[ ] No entity name conflicts with specs/database/schema.md
```

**Note**: Do NOT generate the OpenAPI patch during /create-feature — the full openapi.yaml update happens during /implement-feature review.

---

## Step 3 — Frontend Agent: UI spec (feature-level)

**Read these files in order:**
1. `agents/frontend-agent.md`
2. `specs/features/{feature-slug}/feature-spec.md`
3. `specs/architecture/frontend.md`
4. `specs/architecture/security.md`
5. `specs/templates/ui-spec.md`

**Produce**: `specs/features/{feature-slug}/ui-spec.md`

This is a feature-level UI spec that lists which pages and components are needed, references the detailed page specs in `specs/ui/`, and defines the component file targets. It does NOT generate code.

---

## Step 4 — QA Agent: Test spec (skeleton)

**Read these files in order:**
1. `agents/qa-agent.md`
2. `specs/features/{feature-slug}/feature-spec.md`
3. `specs/templates/test-spec.md`

**Produce**: `specs/features/{feature-slug}/test-spec.md`

Populate the AC coverage map and BR coverage map with rows from the feature spec. Leave test IDs blank (they are filled during /generate-tests). This is the traceability skeleton.

---

## Step 5 — Summary

Print:
```
✅ Spec bundle created for: {FeatureName}

Files created:
  specs/features/{feature-slug}/feature-spec.md  [Status: Draft]
  specs/features/{feature-slug}/db-spec.md        [Status: Draft]
  specs/features/{feature-slug}/api-spec.md       [Status: Draft]
  specs/features/{feature-slug}/ui-spec.md        [Status: Draft]
  specs/features/{feature-slug}/test-spec.md      [Status: Draft]

⚠  Review required before implementation:
  1. Open specs/features/{feature-slug}/feature-spec.md
  2. Review all ACs — are they independently testable?
  3. Review all BRs — are they enforceable constraints?
  4. Review the permissions matrix — does it match the PRD?
  5. Change Status: Draft → Status: Approved in feature-spec.md
  6. Review db-spec.md — correct entity shape and constraints?
  7. Review api-spec.md — correct endpoints and response shapes?
  8. Change Status: Draft → Status: Approved in db-spec.md and api-spec.md

The /implement-feature command will not run until feature-spec.md, db-spec.md,
and api-spec.md all have Status: Approved.
```

---

## Rules

- Do not create any files outside `specs/features/{feature-slug}/`
- Do not write any application code
- Do not modify existing global spec files (openapi.yaml, schema.md, erd.md)
- If a feature folder already exists, stop and report — never silently overwrite
- Status is always `Draft` on creation — only the human reviewer sets `Approved`
