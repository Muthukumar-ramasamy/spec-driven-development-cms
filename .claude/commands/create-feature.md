# Command: /create-feature

**Usage**: `/create-feature {FeatureName}`

**Example**: `/create-feature LeadManagement`

---

## What this command does

Creates the complete spec bundle for a new CRM feature. Runs the Product Agent, then the Architect Agent, in sequence. Does not generate any code.

---

## Steps

### Step 1 — Create feature folder
Create the folder: `specs/features/{feature-name-kebab}/`

### Step 2 — Run Product Agent
Read: `agents/product-agent.md`
Read: `specs/templates/feature-spec.md`

Produce: `specs/features/{feature-name-kebab}/feature-spec.md`

The feature spec must be fully completed — all sections filled, no placeholder text remaining.

### Step 3 — Run Architect Agent
Read: `agents/architect-agent.md`
Read: `specs/templates/db-spec.md`
Read: `specs/templates/api-spec.md`
Read: `specs/database/schema.md` (existing entities — avoid conflicts)
Read: `specs/api/openapi.yaml` (existing endpoints — avoid conflicts)
Read: the feature spec just created in Step 2

Produce:
- `specs/features/{feature-name-kebab}/db-spec.md`
- `specs/features/{feature-name-kebab}/api-spec.md`

### Step 4 — Run Frontend Agent (UI spec only)
Read: `agents/frontend-agent.md`
Read: `specs/templates/ui-spec.md`
Read: the feature spec from Step 2

Produce: `specs/features/{feature-name-kebab}/ui-spec.md`

### Step 5 — Run QA Agent (test spec only)
Read: `agents/qa-agent.md`
Read: `specs/templates/test-spec.md`
Read: the feature spec from Step 2

Produce: `specs/features/{feature-name-kebab}/test-spec.md`

### Step 6 — Summary
Print a summary:
```
✅ Feature spec bundle created for: {FeatureName}

Files created:
  specs/features/{feature}/feature-spec.md
  specs/features/{feature}/db-spec.md
  specs/features/{feature}/api-spec.md
  specs/features/{feature}/ui-spec.md
  specs/features/{feature}/test-spec.md

Next step: Review specs, then run /implement-feature {FeatureName}
```

---

## Rules

- Do not create any files outside `specs/features/{feature}/`
- Do not write any application code
- Do not modify existing spec files
- If a feature folder already exists, ask before overwriting
