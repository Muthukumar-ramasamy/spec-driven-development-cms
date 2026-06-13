# Command: /generate-docs

**Usage**: `/generate-docs`

No arguments. Generates all project documentation from existing specs and the live database.

---

## Pre-flight check

Verify `specs/api/openapi.yaml` exists. If not:
> "openapi.yaml not found at specs/api/openapi.yaml — cannot generate API reference. Run /approve-spec and /implement-feature for at least one module first."
Stop.

---

## Step 1 — API reference

Run:
```bash
npx @redocly/cli build-docs specs/api/openapi.yaml --output docs/api/index.html --title "CRM API Reference"
```

If `@redocly/cli` is not installed:
```bash
npm install -g @redocly/cli
```
Then retry.

Output: `docs/api/index.html` — single self-contained HTML file.

---

## Step 2 — Feature summary pages

For each folder in `specs/features/`, read:
1. `feature-spec.md` — extract: user stories section, ACs list, BRs list
2. `api-spec.md` — extract: endpoints table
3. `review.md` (if exists) — extract: Result line

Write `docs/features/{feature-slug}.md`:

```markdown
# {Feature Name}

**Pipeline stage**: {Approved / Implemented / Tests written / Reviewed / Done}
**Review result**: {Approved / Needs changes / Blocked / Not yet reviewed}

## User Stories
{bullet list}

## Acceptance Criteria
{numbered list}

## Business Rules
{numbered list}

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
{rows from api-spec.md}
```

---

## Step 3 — DB schema doc

Query the live database:
```sql
SELECT
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;
```

Write `docs/db/schema.md` with one section per table. If no tables exist yet (scaffold not run), write:
> "No tables found — run /scaffold and /implement-feature first."

---

## Step 4 — SDD framework guide

Write `docs/sdd-framework.md` using content from:
- `CLAUDE.md` — pipeline, commands, invariants
- `agents/*.md` — agent descriptions
- `specs/phases/*.md` — phase decisions

Structure:
```markdown
# Spec-Driven Development Framework

## What is SDD?
## The 7-step pipeline
## Non-negotiable invariants
## Slash command reference
## Agent reference
## Adding a new feature — walkthrough
## Troubleshooting
```

---

## Step 5 — Summary

```
✅ Documentation generated

  docs/api/index.html           — API reference (open in browser)
  docs/features/                — {N} feature summaries
  docs/db/schema.md             — Live DB schema ({N} tables)
  docs/sdd-framework.md         — SDD developer guide

Open the API reference:
  start docs/api/index.html     (Windows)
  open docs/api/index.html      (macOS)
```

---

## Rules

- Never modify spec files — read only
- Never delete existing docs — overwrite only
- If a feature has no review.md, show "Not yet reviewed" — do not skip it
- DB schema comes from the live database via MCP, not from Drizzle schema files
