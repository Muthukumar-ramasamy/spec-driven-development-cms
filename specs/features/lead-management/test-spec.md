# Test Spec: Lead Management

---

## 1. Coverage Map

| AC # | Criterion | Unit | Integration | E2E |
|------|-----------|------|-------------|-----|
| AC-01 | Create lead with title | ✅ | ✅ | ✅ |
| AC-02 | List scoped to org | ✅ | ✅ | ✅ |
| AC-03 | Sales Rep sees own leads | ✅ | ✅ | ✅ |
| AC-04 | Default filter excludes disqualified/converted | ✅ | ✅ | ✅ |
| AC-05 | Convert creates deal | ✅ | ✅ | ✅ |
| AC-06 | Converted deal linked to lead | ❌ | ✅ | ✅ |
| AC-07 | Cannot convert twice | ✅ | ✅ | ✅ |
| AC-08 | Disqualify lead | ✅ | ✅ | ✅ |
| AC-09 | Manager sees all org leads | ✅ | ✅ | ✅ |

---

## 2. Unit Tests

**File**: `backend/src/modules/leads/__tests__/leads.service.test.ts`

```
LeadService
  create()
    ✅ leads-unit-01: creates lead with title; status = new
    ✅ leads-unit-02: throws ValidationError for missing title

  convert()
    ✅ leads-unit-03: creates deal and marks lead as converted
    ✅ leads-unit-04: throws UnprocessableError for already-converted lead
    ✅ leads-unit-05: throws ValidationError for missing stageId

  list()
    ✅ leads-unit-06: sales rep sees own leads only
    ✅ leads-unit-07: default filter excludes disqualified + converted
```

---

## 3. Integration Tests

**File**: `backend/src/modules/leads/__tests__/leads.repository.test.ts`

```
POST /api/leads/:id/convert
  ✅ leads-int-01: creates deal; lead status = converted; converted_deal_id set
  ✅ leads-int-02: returns 422 for second conversion attempt

GET /api/leads
  ✅ leads-int-03: org isolation
  ✅ leads-int-04: sales rep sees own leads only

DELETE /api/leads/:id
  ✅ leads-int-05: admin can delete non-converted lead
  ✅ leads-int-06: returns 403 for non-admin
```

---

## 4. E2E Tests (Playwright)

**File**: `e2e/leads.spec.ts`

```
  ✅ leads-e2e-01: sales rep creates lead; appears in inbox
  ✅ leads-e2e-02: convert lead → deal created; lead shows "Converted" status
  ✅ leads-e2e-03: convert already-converted lead → error shown
  ✅ leads-e2e-04: disqualify lead → disappears from default inbox view
```

---

## 5. Permission Tests

| Role | Action | Expected | Test ID |
|------|--------|----------|---------|
| Sales Rep | Create lead | 201 | leads-int-07 |
| Sales Rep | Convert own lead | 200 | leads-int-01 |
| Sales Rep | View another's lead | 403 | leads-int-08 |
| Admin | Delete lead | 200 | leads-int-05 |
| Manager | Delete lead | 403 | leads-int-06 |
