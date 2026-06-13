# Command: /approve-spec

**Usage**: `/approve-spec {FeatureName}`

**Example**: `/approve-spec LeadManagement`

Feature name → kebab slug: `LeadManagement` → `lead-management`

---

## What this command does

Walks through every spec file in a feature bundle, checks each one for completeness, and — after confirmation — changes `Status: Draft` to `Status: Approved`.

This is the approval gate between spec creation and implementation. The `/implement-feature` command will not run until the three implementation-blocking specs are Approved.

---

## Step 1 — Read all spec files

Read:
1. `specs/features/{feature-slug}/feature-spec.md`
2. `specs/features/{feature-slug}/db-spec.md`
3. `specs/features/{feature-slug}/api-spec.md`
4. `specs/features/{feature-slug}/ui-spec.md`
5. `specs/features/{feature-slug}/test-spec.md`

---

## Step 2 — Run readiness checks

For each file, check the readiness conditions below. If any check fails, list it as a blocker.

### feature-spec.md checks
```
[ ] All 14 sections present and not empty
[ ] No {placeholder} text remains
[ ] At least 3 user stories (each with role/action/outcome)
[ ] Every AC uses Given / When / Then format
[ ] ACs are numbered AC-01, AC-02, ...
[ ] BRs are numbered BR-01, BR-02, ...
[ ] Permissions matrix covers all 3 roles
[ ] At least one explicit out-of-scope item
[ ] Section 14 Open Questions: all Resolved or empty
[ ] No code, DB field names, or API paths in the body
[ ] Current status is Draft or Review
```

### db-spec.md checks
```
[ ] All entity fields listed with types
[ ] Every entity has: id (UUID), organization_id, created_at, updated_at, deleted_at
[ ] Relationships section complete
[ ] Critical constraints documented
[ ] No auto-increment integer PKs or FKs
```

### api-spec.md checks
```
[ ] Every endpoint has an HTTP method, path, and auth requirement
[ ] Every endpoint has at least one response shape documented
[ ] Every list endpoint includes: page, limit, sort, order, search
[ ] Error codes match the feature-spec.md Error Cases section
[ ] Standard envelope documented: { data } / { data, pagination }
```

---

## Step 3 — Report blockers

If any blockers are found:

```
⚠️  Spec bundle NOT ready to approve for: {FeatureName}

Blockers found:
  feature-spec.md:
    - {specific issue 1}
    - {specific issue 2}

  db-spec.md:
    - {specific issue}

Fix these issues and re-run /approve-spec {FeatureName}.
```

Stop — do not modify any files.

---

## Step 4 — Confirm and approve (no blockers)

If no blockers, present a summary:

```
✅ Spec bundle looks good for: {FeatureName}

Summary:
  feature-spec.md: {N} user stories, {N} ACs, {N} BRs
  db-spec.md:      {N} entities, {N} fields documented
  api-spec.md:     {N} endpoints defined

Files that will be changed to Status: Approved:
  ✅ specs/features/{feature-slug}/feature-spec.md  (Draft → Approved)
  ✅ specs/features/{feature-slug}/db-spec.md        (Draft → Approved)
  ✅ specs/features/{feature-slug}/api-spec.md       (Draft → Approved)

Note: ui-spec.md and test-spec.md remain Draft until implementation.
Note: Only the 3 specs above gate /implement-feature.
```

Then update the Status field in all three files from `Draft` to `Approved`.

For each file, find the line:
```
| Status | Draft |
```
And replace with:
```
| Status | Approved |
```

---

## Step 5 — Confirm completion

```
✅ Approved:
  specs/features/{feature-slug}/feature-spec.md
  specs/features/{feature-slug}/db-spec.md
  specs/features/{feature-slug}/api-spec.md

You can now run: /implement-feature {FeatureName}
```

---

## Rules

- Never set Status to Approved if any blocker check failed
- Only update the three implementation-blocking specs (feature-spec, db-spec, api-spec)
- ui-spec.md and test-spec.md are approved separately after implementation
- Do not modify any file content other than the Status field
