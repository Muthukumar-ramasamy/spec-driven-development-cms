# Test Spec: Basic Reports

---

## 1. Coverage Map

| AC # | Criterion | Unit | Integration | E2E |
|------|-----------|------|-------------|-----|
| AC-01 | Deals report filtered by date range | ✅ | ✅ | ✅ |
| AC-02 | Pipeline value scoped to org | ✅ | ✅ | ✅ |
| AC-03 | Pipeline value grouped by stage | ✅ | ✅ | ✅ |
| AC-04 | Activity report by rep | ✅ | ✅ | ✅ |
| AC-05 | Leads by source | ✅ | ✅ | ✅ |
| AC-06 | Sales Rep sees own data only | ✅ | ✅ | ✅ |
| AC-07 | Manager sees all org data | ✅ | ✅ | ✅ |
| AC-08 | Default date range is last 30 days | ✅ | ✅ | ✅ |

---

## 2. Unit Tests

**File**: `backend/src/modules/reports/__tests__/reports.service.test.ts`

```
ReportsService
  getDealsReport()
    ✅ reports-unit-01: returns won/lost counts for date range
    ✅ reports-unit-02: sales rep sees only own deals
    ✅ reports-unit-03: manager sees all org deals

  getPipelineValue()
    ✅ reports-unit-04: groups open deals by stage
    ✅ reports-unit-05: org isolation

  getActivitiesReport()
    ✅ reports-unit-06: counts per type per rep
    ✅ reports-unit-07: sales rep sees own only

  getLeadsBySource()
    ✅ reports-unit-08: counts leads per source for date range
```

---

## 3. Integration Tests

**File**: `backend/src/modules/reports/__tests__/reports.repository.test.ts`

```
GET /api/reports/deals
  ✅ reports-int-01: org A data not visible to org B
  ✅ reports-int-02: date range filter works correctly

GET /api/reports/pipeline-value
  ✅ reports-int-03: only open deals included (not won/lost)
  ✅ reports-int-04: stages ordered by display_order

GET /api/reports/activities
  ✅ reports-int-05: sales rep ownerId override — cannot see others' data

GET /api/reports/leads-by-source
  ✅ reports-int-06: date range applied to lead created_at
```

---

## 4. E2E Tests (Playwright)

**File**: `e2e/reports.spec.ts`

```
  ✅ reports-e2e-01: reports page loads with default 30-day range
  ✅ reports-e2e-02: change date range → data refreshes
  ✅ reports-e2e-03: sales rep only sees own deal count
  ✅ reports-e2e-04: manager sees all-org data
```

---

## 5. Permission Tests

| Role | Action | Expected | Test ID |
|------|--------|----------|---------|
| Sales Rep | View reports | 200 (own data only) | reports-int-05 |
| Manager | View reports | 200 (all org data) | reports-int-01 |
| Sales Rep | Pass another's ownerId | silently overridden to own | reports-int-05 |
| All roles | POST to /api/reports/* | 404 (no mutation routes) | reports-int-09 |
