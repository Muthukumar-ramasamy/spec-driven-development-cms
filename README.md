# CRM — Spec-Driven Development

A Pipedrive-like CRM built as the proving ground for a reusable **Spec-Driven Development (SDD)** framework.

> The primary goal is not "build a CRM." It is: given any feature requirement, the framework can generate specs, architecture, API contracts, UI specs, code, and tests with minimal manual intervention.

---

## What is Spec-Driven Development?

SDD is a workflow where every artifact — code, tests, docs — is generated from a specification, not written directly. The spec is the source of truth.

```
Requirement
    ↓
Feature Spec  (specs/features/{name}/)
    ↓
Architecture  (specs/architecture/)
    ↓
API Contract  (specs/api/openapi.yaml)
    ↓
UI Spec       (specs/ui/)
    ↓
Code          (frontend/ + backend/)
    ↓
Tests         (tests/)
    ↓
Docs          (docs/)
```

Each arrow is driven by a Claude agent reading the previous artifact.

---

## Repo Structure

```
crm-sdd/
├── specs/
│   ├── templates/       # Reusable spec templates (the framework)
│   ├── product/         # PRD, domain analysis
│   ├── architecture/    # System, frontend, backend, security specs
│   ├── database/        # ERD, schema
│   ├── api/             # OpenAPI specification
│   ├── ui/              # Per-page UI specs
│   └── features/        # Per-feature spec bundles
├── agents/              # Claude agent definitions
├── .claude/
│   ├── commands/        # Slash commands for Claude Code
│   └── workflows/       # Multi-step workflow definitions
├── frontend/            # React application
├── backend/             # Node.js API
├── docs/                # Generated documentation
│   └── adr/             # Architecture Decision Records
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## Quick Start

### 1. Create a new feature spec
```
/create-feature LeadManagement
```

### 2. Implement from spec
```
/implement-feature LeadManagement
```

### 3. Generate tests
```
/generate-tests LeadManagement
```

---

## CRM Modules (MVP)

| Module | Status |
|--------|--------|
| Lead Management | 🔲 Spec pending |
| Contact Management | 🔲 Spec pending |
| Company Management | 🔲 Spec pending |
| Deal / Pipeline | 🔲 Spec pending |
| Activity & Tasks | 🔲 Spec pending |
| Reports & Dashboards | 🔲 Spec pending |
| Automations | 🔲 Spec pending |

---

## Agents

| Agent | Responsibility |
|-------|---------------|
| `product-agent` | Requirements, user stories, acceptance criteria |
| `architect-agent` | ERD, API contracts, system design |
| `frontend-agent` | React components, pages, forms |
| `backend-agent` | Controllers, services, repositories |
| `qa-agent` | Unit, integration, E2E tests |

---

## Rules

1. **Never write code before a spec exists.**
2. **Never build an endpoint before its OpenAPI entry exists.**
3. **Never build a page before its UI spec exists.**
4. **Every acceptance criterion must have a corresponding test.**
5. **Specs are the source of truth — code follows specs, not the other way around.**
