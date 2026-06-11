# Workflow: Feature Development Lifecycle

This workflow governs how every CRM feature moves from idea to production.
No step can be skipped. No step can be reversed without approval.

---

## The Pipeline

```
[1. Requirement]
      ↓
[2. /create-feature]     ← Product + Architect + Frontend + QA agents
      ↓
[3. Spec Review]         ← Human review and approval
      ↓
[4. /implement-feature]  ← Backend + Frontend agents
      ↓
[5. /generate-tests]     ← QA agent
      ↓
[6. /review-feature]     ← Automated spec compliance check
      ↓
[7. Done]
```

---

## Stage gates

| Gate | Condition to pass |
|------|------------------|
| After `/create-feature` | All spec files exist. `feature-spec.md` status set to "Approved" manually. |
| After `/implement-feature` | All output files exist. No TypeScript errors. |
| After `/generate-tests` | All ACs have a corresponding E2E test. |
| After `/review-feature` | Review report result is "✅ Approved". |

---

## Feature states

```
Draft → Review → Approved → In Progress → Testing → Done
```

Update the status in `feature-spec.md` header as the feature progresses.

---

## Example: Full lifecycle for Lead Management

```bash
# Step 1: Generate all specs
/create-feature LeadManagement

# Step 2: Review specs/features/lead-management/ manually
# Update feature-spec.md Status: Draft → Approved

# Step 3: Implement from specs
/implement-feature LeadManagement

# Step 4: Generate tests
/generate-tests LeadManagement

# Step 5: Review implementation
/review-feature LeadManagement

# Step 6: Fix any issues flagged in review, then done
```

---

## Spec amendment process

If a requirement changes after a spec is approved:

1. Update the `feature-spec.md` — set Status back to "Draft"
2. Note the change in the "Open Questions" table with a date
3. Re-run the affected downstream specs (db-spec, api-spec, ui-spec as needed)
4. Re-run `/review-feature` after implementing the change

Never change a spec silently. The spec is the audit trail.

---

## Module implementation order

Build features in this order to respect data dependencies:

1. Auth (users, organizations, JWT) — foundation for everything
2. Contacts — no dependencies
3. Companies — no dependencies
4. Leads — depends on Contacts, Companies
5. Deals / Pipeline — depends on Leads, Contacts
6. Activities — depends on Contacts, Deals
7. Tasks — depends on Users, Deals
8. Reports — depends on all of the above
9. Automations — depends on all of the above
