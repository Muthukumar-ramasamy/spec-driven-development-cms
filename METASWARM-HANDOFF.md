# Metaswarm Assignment — Handoff Document

## Assignment

Rebuild the same CRM project using **metaswarm** (multi-agent orchestration framework).
Compare the two approaches: our custom SDD framework vs metaswarm.

---

## Prerequisites (install before starting)

| Tool | Required | Purpose |
|------|----------|---------|
| Claude Code | ✅ Yes | Primary AI CLI |
| GitHub CLI (`gh`) | ✅ Yes | PR creation + shepherding |
| Node.js 18+ | ✅ Yes | Runtime |
| BEADS CLI (`bd`) v0.40+ | Optional | Knowledge base + task tracking |
| Superpowers plugin | Optional | Additional agentic skills |
| Gemini CLI | Optional | Cross-model adversarial review |

Install GitHub CLI: https://cli.github.com/
Install BEADS CLI: https://beads.dev/ (if available)

---

## Step 1 — Install Metaswarm

**Option A — Simplest (recommended by GitHub docs):**

Open Claude Code in the project directory and just say:

```
Read through https://github.com/dsifry/metaswarm and install it for my project.
```

Claude reads the docs, understands your project structure, installs the plugin,
and configures everything for your stack automatically.

**Option B — Direct install:**

```bash
claude plugin marketplace add dsifry/metaswarm-marketplace
claude plugin install metaswarm
```

Then in Claude Code run:
```
/metaswarm:setup
```

Setup auto-detects: TypeScript, Fastify, React/Vite, Vitest, Playwright, npm,
and configures CLAUDE.md, coverage thresholds, and .gitignore.

---

## Step 2 — Verify Installation

```
/metaswarm:status
```

Should show all agents, skills, and commands installed correctly.

---

## Step 3 — Start the First Module

Run `/metaswarm:start-task` with this prompt (for Auth module first — all others depend on it):

```
/metaswarm:start-task Build the Auth & User Management module for a CRM application.

Tech stack: Fastify v4 (backend), Drizzle ORM + Neon PostgreSQL (database),
React 18 + MUI v5 (Material UI) + TanStack Query v5 (frontend),
Vitest (unit + integration tests), Playwright (E2E tests), TypeScript throughout.

The approved spec is already written in this repo:
  specs/features/auth-user-management/feature-spec.md  — user stories, ACs, BRs, permissions
  specs/features/auth-user-management/db-spec.md        — entity fields, types, indexes
  specs/features/auth-user-management/api-spec.md       — endpoints, request/response shapes
  specs/features/auth-user-management/ui-spec.md        — page layout, forms, flows
Full OpenAPI spec: specs/api/openapi.yaml

Non-negotiable rules (enforced in every file):
  1. Soft delete only — deleted_at = NOW(), never DELETE FROM
  2. Every DB query scoped by organization_id (from JWT only, never req.body/req.params)
  3. UUID PKs on all tables — no integers
  4. Response envelope: { data } for single item, { data, pagination } for lists
  5. Role-restricted UI elements must be HIDDEN — never just disabled
  6. No TypeScript `any` in service.ts or repository.ts

Definition of Done:
  1. All acceptance criteria in feature-spec.md pass in E2E tests
  2. All business rules in feature-spec.md have unit test coverage in service layer
  3. Multi-tenancy isolation test: org A records are NOT visible to org B
  4. TypeScript compiles with zero errors and zero `any` types in core layers
  5. JWT auth flow works end to end (login → token → protected route)
  6. Role-based access enforced: admin / manager / sales_rep permissions match spec

Human checkpoints:
  - After database schema is finalized (before any code)
  - After JWT middleware is implemented (security-critical)

Use the full metaswarm orchestration workflow:
research, plan, design review gate (6 agents in parallel),
decompose into work units, execute each through the 4-phase loop
(implement → validate → adversarial review → commit).
When all work units pass, create a PR.
```

---

## Module Order (run one at a time — each depends on the previous)

| # | Module | Folder slug | Key dependency |
|---|--------|-------------|---------------|
| 1 | Auth & User Management | `auth-user-management` | None — start here |
| 2 | Contact Management | `contact-management` | Auth (JWT, org) |
| 3 | Company Management | `company-management` | Auth |
| 4 | Lead Management | `lead-management` | Auth, Contacts, Companies |
| 5 | Deal & Pipeline Management | `deal-pipeline-management` | Auth, Contacts, Companies |
| 6 | Activity & Task Tracking | `activity-task-tracking` | Auth, Contacts, Companies, Leads, Deals |
| 7 | Notes | `notes` | Auth, Contacts, Companies, Leads, Deals |
| 8 | Basic Reports | `basic-reports` | All above modules |

For each module, copy the task prompt template above and replace the module name/slug.
The spec files are already in `specs/features/{slug}/`.

---

## What Already Exists (Do Not Rebuild From Scratch)

All 8 feature spec bundles are written and approved:

```
specs/features/auth-user-management/    ← feature-spec, db-spec, api-spec, ui-spec, test-spec
specs/features/contact-management/
specs/features/company-management/
specs/features/lead-management/
specs/features/deal-pipeline-management/
specs/features/activity-task-tracking/
specs/features/notes/
specs/features/basic-reports/
specs/api/openapi.yaml                  ← 38 endpoints, full OpenAPI spec
specs/architecture/                     ← backend, frontend, security architecture specs
```

Point metaswarm's Research agent to these files — it doesn't need to discover the domain from scratch.

---

## Metaswarm's 11-Phase Pipeline (what happens after /metaswarm:start-task)

```
1  Research          → Researcher agent explores codebase, finds patterns
2  Plan              → Architect agent creates implementation plan
3  Plan Validation   → 3 adversarial reviewers (Feasibility, Completeness, Scope) — all 3 must approve
4  Design Review     → PM, Architect, Designer, Security, UX Reviewer, CTO — 6 agents in parallel, all must approve
5  Decompose         → Break plan into work units with DoD items + dependency graph
6  External Deps     → Identifies API keys needed, prompts you to configure them
7  Execute           → Per work unit: Implement → Validate → Adversarial Review → Commit
                       (quality gates are BLOCKING — no path from FAIL to COMMIT)
8  Final Review      → Cross-unit integration check, full test suite, coverage enforcement
9  PR Creation       → Creates PR with structured description + test plan
10 PR Shepherd       → Monitors CI, handles review comments, resolves threads
11 Close + Learn     → Extracts learnings into knowledge base (JSONL in repo)
```

Human checkpoints you defined in the prompt pause execution and wait for your explicit approval.

---

## After Each Module Merges

Run:
```
/metaswarm:self-reflect
```

This analyzes the session, extracts patterns and gotchas, and writes them to the knowledge base.
Future modules load relevant entries automatically (filtered by files being touched).

---

## Environment Setup

```
backend/.env.example  →  copy to  backend/.env
frontend/.env.example →  copy to  frontend/.env
```

Required values:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_SECRET` — minimum 32 character random string
- `VITE_API_URL=http://localhost:3000`

Note: `.mcp.json` is in `.gitignore` — do NOT commit it (contains live credentials).

---

## Key Comparison Points for Assignment Writeup

Document these as you run each module through metaswarm:

| Dimension | Our SDD (Claude Code) | Metaswarm |
|-----------|----------------------|-----------|
| Spec creation | Human-guided, AI drafted, human approval gate | AI researches codebase autonomously |
| Review gates | 1 human approval per spec | 6 parallel AI agents + 3 plan validators |
| Code review | Single model (Claude reviews its own output) | Cross-model (Claude writes → Gemini reviews) |
| Gate enforcement | Manual command per spec | Blocking state machine (no FAIL→COMMIT path) |
| Test coverage | Manual `/generate-tests` command | Coverage thresholds block PR + enforce pre-push hook |
| PR management | Manual | Automated creation, CI monitoring, comment handling |
| Learning | Specs stay static | Grows a JSONL knowledge base after every PR |
| Transparency | Clear audit trail in spec files | Harder to trace individual decisions |
| Human control | You approve each spec explicitly | You define checkpoints upfront |
| Agent count | 5 (Product, Architect, Backend, Frontend, QA) | 18 distinct personas |

---

## Questions to Answer in Assignment Writeup

1. Did metaswarm's Research phase match what we captured manually in our specs?
2. Did the 6-agent Design Review Gate catch issues our human review missed?
3. Did cross-model adversarial review (Claude writes → Gemini reviews) find different bugs than single-model review?
4. Were the automated quality gates (coverage enforcement, blocking FAIL→COMMIT) stricter than our manual process?
5. Which approach produced more maintainable, better-tested code?
6. Which approach gave you more confidence in what was shipped and why?
7. What would you use for a real production project?
