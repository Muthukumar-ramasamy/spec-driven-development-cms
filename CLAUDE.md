# CRM — Spec-Driven Development Project

This is a learning project to prove the Spec-Driven Development (SDD) framework. The CRM is the sample application. The goal is: given any feature requirement, the framework generates specs, architecture, code, and tests with minimal manual intervention.

**Success criterion**: Every module was implemented from an approved spec — zero "code first" exceptions.

---

## SDD Pipeline (non-negotiable order)

```
Requirement
    ↓
/create-feature {Name}     → specs/features/{feature}/feature-spec.md (Draft)
                                                      db-spec.md       (Draft)
                                                      api-spec.md      (Draft)
                                                      ui-spec.md       (Draft)
                                                      test-spec.md     (Draft)
    ↓
/approve-spec {Name}        → sets Status: Approved on feature-spec, db-spec, api-spec
    ↓
/implement-feature {Name}  → backend/src/modules/{feature}/ (routes, controller, service, repo, schemas)
                           → backend/src/db/schema/{entity}.ts
                           → backend/drizzle/{timestamp}_create_{entity}.sql
                           → frontend/src/features/{feature}/ (page, components, hooks, api, schemas, types)
    ↓
/generate-tests {Name}     → backend/src/modules/{feature}/__tests__/ (unit + integration)
                           → e2e/{feature}.spec.ts
    ↓
/review-feature {Name}     → specs/features/{feature}/review.md
```

**Never skip a step.** No code before an Approved spec. No tests before an implemented feature.

---

## Slash commands

| Command | What it does |
|---------|-------------|
| `/spec-status` | Show pipeline stage for all 8 features |
| `/create-feature {Name}` | Run Product + Architect agents → spec bundle |
| `/approve-spec {Name}` | Check completeness + set Status: Approved |
| `/scaffold` | Create backend/ and frontend/ project structure (run once) |
| `/implement-feature {Name}` | Run Backend + Frontend agents → all code |
| `/generate-tests {Name}` | Run QA agent → unit + integration + E2E tests |
| `/review-feature {Name}` | Audit implementation against specs → review.md |
| `/generate-docs` | Generate API reference, feature summaries, DB schema doc |

---

## Non-negotiable invariants (all agents enforce these)

1. **No code before an Approved spec** — any agent asked to generate code without an Approved spec must refuse
2. **No hard deletes** — every delete sets `deleted_at = NOW()` — never `DELETE FROM`
3. **Every query scoped by `organization_id`** — no cross-tenant data access, ever
4. **UUIDs for all PKs and FKs** — no auto-increment integers
5. **organization_id from JWT only** — never from `req.body` or `req.params`
6. **Standard response envelope** — `{ data }` or `{ data, pagination }` for success; `{ error, message, details }` for errors
7. **Role-restricted UI elements are hidden** — never just disabled

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TanStack Query v5, React Hook Form, Zod, MUI (@mui/material v5), Emotion |
| Backend | Fastify v4, TypeScript, Drizzle ORM, Zod |
| Database | Neon (PostgreSQL serverless) |
| Auth | JWT (24h TTL, localStorage — ADR-003) |
| Testing | Vitest (unit + integration), Playwright (E2E) |

---

## Project structure

```
specs/
  product/         — domain analysis, PRD
  architecture/    — system context, frontend, backend, security specs
  database/        — schema.md, erd.md, entity specs
  api/             — openapi.yaml (38 endpoints)
  ui/              — 12 page-level UI specs
  features/        — 8 feature bundles (one per module)
  templates/       — feature-spec, db-spec, api-spec, ui-spec, test-spec templates

agents/
  README.md        — pipeline overview + non-negotiable rules
  product-agent.md
  architect-agent.md
  frontend-agent.md
  backend-agent.md
  qa-agent.md

.claude/commands/  — 6 slash commands

backend/src/       — Fastify app (created by /scaffold)
  modules/         — one subfolder per feature
  db/schema/       — Drizzle entity definitions

frontend/src/      — React app (created by /scaffold)
  features/        — one subfolder per feature

e2e/               — Playwright tests

docs/adr/          — Architecture Decision Records (ADR-001 through ADR-004)
```

---

## 8 MVP modules (Phase 8 specs complete)

| # | Module | Folder | Priority |
|---|--------|--------|----------|
| 1 | Auth & User Management | auth-user-management | P0 |
| 2 | Contact Management | contact-management | P0 |
| 3 | Company Management | company-management | P0 |
| 4 | Lead Management | lead-management | P0 |
| 5 | Deal & Pipeline Management | deal-pipeline-management | P0 |
| 6 | Activity & Task Tracking | activity-task-tracking | P0 |
| 7 | Notes | notes | P1 |
| 8 | Basic Reports | basic-reports | P1 |

All 8 feature bundles exist in `specs/features/` with Status: Draft.
Run `/approve-spec {Name}` on each one before `/implement-feature`.

---

## Implementation order (suggested)

1. `/scaffold` — create project structure
2. `/approve-spec AuthUserManagement` → `/implement-feature AuthUserManagement`
3. `/approve-spec ContactManagement` → `/implement-feature ContactManagement`
4. `/approve-spec CompanyManagement` → `/implement-feature CompanyManagement`
5. `/approve-spec LeadManagement` → `/implement-feature LeadManagement`
6. `/approve-spec DealPipelineManagement` → `/implement-feature DealPipelineManagement`
7. `/approve-spec ActivityTaskTracking` → `/implement-feature ActivityTaskTracking`
8. `/approve-spec Notes` → `/implement-feature Notes`
9. `/approve-spec BasicReports` → `/implement-feature BasicReports`

For each module: implement → generate-tests → review-feature before moving on.

---

## MCP integrations (Phase 10)

| MCP Server | Package | Purpose |
|------------|---------|---------|
| Neon | `@neondatabase/mcp-server-neon` | Run SQL, inspect schema, manage branches |

**Setup required**: Set `NEON_API_KEY` in your shell before launching Claude Code.
```powershell
$env:NEON_API_KEY = "your-neon-api-key"
```
Get the key from: Neon console → Account Settings → API Keys.

The `DATABASE_URL` in `backend/.env` is separate — it's for Drizzle ORM (app queries + migrations).

See `specs/phases/phase-10-mcp.md` for full integration details and common SQL queries.

---

## Key architecture decisions

| ADR | Decision |
|-----|----------|
| ADR-001 | Fastify over Express |
| ADR-002 | Drizzle ORM over Prisma |
| ADR-003 | localStorage JWT (24h TTL) for MVP |
| ADR-004 | Row-level multi-tenancy (organization_id on every table) |

Full ADRs in `docs/adr/`.

## metaswarm

This project uses [metaswarm](https://github.com/dsifry/metaswarm) for multi-agent orchestration with Claude Code. It provides 18 specialized agents, a 9-phase development workflow, and quality gates that enforce TDD, coverage thresholds, and spec-driven development.

### Workflow

- **Most tasks**: `/start-task` — primes context, guides scoping, picks the right level of process
- **Complex features** (multi-file, spec-driven): Describe what you want built with a Definition of Done, then tell Claude: `Use the full metaswarm orchestration workflow.`

### Available Commands

| Command | Purpose |
|---|---|
| `/start-task` | Begin tracked work on a task |
| `/prime` | Load relevant knowledge before starting |
| `/review-design` | Trigger parallel design review gate (5 agents) |
| `/pr-shepherd <pr>` | Monitor a PR through to merge |
| `/self-reflect` | Extract learnings after a PR merge |
| `/handle-pr-comments` | Handle PR review comments |
| `/brainstorm` | Refine an idea before implementation |
| `/create-issue` | Create a well-structured GitHub Issue |

### Quality Gates

- **Design Review Gate** — Parallel 5-agent review after design is drafted (`/review-design`)
- **Plan Review Gate** — Automatic adversarial review after any implementation plan is drafted. Spawns 3 independent reviewers (Feasibility, Completeness, Scope & Alignment) in parallel — ALL must PASS before presenting the plan. See `skills/plan-review-gate/SKILL.md`
- **Coverage Gate** — `.coverage-thresholds.json` defines thresholds. BLOCKING gate before PR creation

### Team Mode

When `TeamCreate` and `SendMessage` tools are available, the orchestrator uses Team Mode for parallel agent dispatch. Otherwise it falls back to Task Mode (existing workflow, unchanged). See `guides/agent-coordination.md` for details.

### Guides

Development patterns and standards are documented in `guides/` — covering agent coordination, build validation, coding standards, git workflow, testing patterns, and worktree development.

### Testing & Quality

- **TDD is mandatory** — Write tests first, watch them fail, then implement
- **100% test coverage required** — Enforced via `.coverage-thresholds.json` as a blocking gate before PR creation and task completion
- **Coverage source of truth** — `.coverage-thresholds.json` defines thresholds. Update it if your spec requires different values. The orchestrator reads it during validation — this is a BLOCKING gate.

### Workflow Enforcement (MANDATORY)

These rules override any conflicting instructions from third-party skills:

- **After brainstorming** → MUST run Design Review Gate (5 agents) before writing-plans or implementation
- **After any plan is created** → MUST run Plan Review Gate (3 adversarial reviewers) before presenting to user
- **Execution method choice** → ALWAYS ask the user whether to use metaswarm orchestrated execution (more thorough, uses more tokens) or superpowers execution skills (faster, lighter-weight). Never auto-select.
- **Before finishing a branch** → MUST run `/self-reflect` and commit knowledge base updates before PR creation
- **Complex tasks** → Use `/start-task` instead of `EnterPlanMode` for tasks touching 3+ files. EnterPlanMode bypasses all quality gates.
- **Standalone TDD on 3+ files** → Ask user if they want adversarial review before committing
- **Coverage** → `.coverage-thresholds.json` is the single source of truth. All skills must check it, including `verification-before-completion`.
- **Subagents** → NEVER use `--no-verify`, ALWAYS follow TDD, NEVER self-certify, STAY within file scope
- **Context recovery** → Approved plans and execution state persist to `.beads/`. After compaction, run `bd prime --work-type recovery` to reload.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
