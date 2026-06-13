# Test Spec: Deal & Pipeline Management

---

## 1. Coverage Map

| AC # | Criterion | Unit | Integration | E2E |
|------|-----------|------|-------------|-----|
| AC-01 | Create deal | ✅ | ✅ | ✅ |
| AC-02 | Board scoped to org | ✅ | ✅ | ✅ |
| AC-03 | Sales Rep sees own deals | ✅ | ✅ | ✅ |
| AC-04 | Won/Lost deals hidden | ✅ | ✅ | ✅ |
| AC-05 | Mark deal won | ✅ | ✅ | ✅ |
| AC-06 | Mark lost requires reason | ✅ | ✅ | ✅ |
| AC-07 | Stage history recorded | ❌ | ✅ | ✅ |
| AC-08 | Stage delete blocked by open deals | ✅ | ✅ | ✅ |
| AC-09 | Stage reorder persisted | ✅ | ✅ | ✅ |
| AC-10 | At least one stage must exist | ✅ | ✅ | ✅ |

---

## 2. Unit Tests

**File**: `backend/src/modules/deals/__tests__/deals.service.test.ts`

```
DealService
  create()
    ✅ deals-unit-01: creates deal with title and stage; status = open
    ✅ deals-unit-02: throws ValidationError for missing stage

  markWon()
    ✅ deals-unit-03: sets status = won, won_at = now

  markLost()
    ✅ deals-unit-04: sets status = lost, lost_at = now
    ✅ deals-unit-05: throws ValidationError for missing lostReason

  deleteStage()
    ✅ deals-unit-06: throws UnprocessableError when open deals exist
    ✅ deals-unit-07: throws UnprocessableError when deleting last stage
```

---

## 3. Integration Tests

**File**: `backend/src/modules/deals/__tests__/deals.repository.test.ts`

```
POST /api/deals/:id/won
  ✅ deals-int-01: status = won; deal removed from open board list

POST /api/deals/:id/lost
  ✅ deals-int-02: status = lost with reason
  ✅ deals-int-03: returns 400 for missing lostReason

PUT /api/pipeline-stages/reorder
  ✅ deals-int-04: display_order updated; board reflects new order

DELETE /api/pipeline-stages/:id
  ✅ deals-int-05: returns 422 when open deals in stage
  ✅ deals-int-06: returns 422 when deleting last stage
  ✅ deals-int-07: returns 403 for non-admin

GET /api/deals (board)
  ✅ deals-int-08: org isolation
  ✅ deals-int-09: sales rep sees own deals only
```

---

## 4. E2E Tests (Playwright)

**File**: `e2e/deals.spec.ts`

```
  ✅ deals-e2e-01: sales rep creates deal; appears in correct stage column
  ✅ deals-e2e-02: drag deal to new stage; stage history updated
  ✅ deals-e2e-03: mark deal won; disappears from board
  ✅ deals-e2e-04: mark deal lost without reason → validation error shown
  ✅ deals-e2e-05: mark deal lost with reason → deal disappears from board
  ✅ deals-e2e-06: admin deletes stage with open deal → error message shown
  ✅ deals-e2e-07: admin reorders stages → new order persisted on reload
```

---

## 5. Permission Tests

| Role | Action | Expected | Test ID |
|------|--------|----------|---------|
| Sales Rep | Create deal | 201 | deals-int-10 |
| Sales Rep | Edit another's deal | 403 | deals-int-11 |
| Admin | Delete deal | 200 | deals-int-12 |
| Admin | Manage pipeline stages | 200 | deals-int-07 |
| Manager | Manage pipeline stages | 403 | deals-int-07 |
| Non-admin | Access /settings/pipeline | redirect | deals-e2e-08 |
