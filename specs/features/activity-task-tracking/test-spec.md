# Test Spec: Activity & Task Tracking

---

## 1. Coverage Map

| AC # | Criterion | Unit | Integration | E2E |
|------|-----------|------|-------------|-----|
| AC-01 | Log past activity (done=true) | ✅ | ✅ | ✅ |
| AC-02 | Schedule task (done=false) | ✅ | ✅ | ✅ |
| AC-03 | Must link to at least one record | ✅ | ✅ | ✅ |
| AC-04 | My task list — own tasks only | ✅ | ✅ | ✅ |
| AC-05 | Overdue tasks flagged | ❌ | ✅ | ✅ |
| AC-06 | Mark task done | ✅ | ✅ | ✅ |
| AC-07 | Tasks grouped by urgency | ❌ | ❌ | ✅ |
| AC-08 | Activity feed on record | ❌ | ✅ | ✅ |
| AC-09 | Manager sees all org tasks | ✅ | ✅ | ✅ |

---

## 2. Unit Tests

**File**: `backend/src/modules/activities/__tests__/activities.service.test.ts`

```
ActivityService
  create()
    ✅ activities-unit-01: creates logged activity with done=true
    ✅ activities-unit-02: creates task with done=false
    ✅ activities-unit-03: throws ValidationError when no linked record

  markDone()
    ✅ activities-unit-04: sets done=true and done_at=now
    ✅ activities-unit-05: throws ValidationError if already done

  list()
    ✅ activities-unit-06: sales rep sees own tasks only
    ✅ activities-unit-07: manager sees all org activities
```

---

## 3. Integration Tests

**File**: `backend/src/modules/activities/__tests__/activities.repository.test.ts`

```
POST /api/activities
  ✅ activities-int-01: creates activity with linked deal; returns 201
  ✅ activities-int-02: returns 400 with no linked record

PUT /api/activities/:id/done
  ✅ activities-int-03: marks done; not in open task list
  ✅ activities-int-04: returns 400 for second done call

GET /api/activities (tasks list)
  ✅ activities-int-05: org isolation
  ✅ activities-int-06: done=false filter returns only open tasks
```

---

## 4. E2E Tests (Playwright)

**File**: `e2e/activities.spec.ts`

```
  ✅ activities-e2e-01: sales rep creates task; appears in My Tasks
  ✅ activities-e2e-02: overdue task appears in Overdue group
  ✅ activities-e2e-03: mark task done; disappears from My Tasks
  ✅ activities-e2e-04: create activity with no linked record → validation error
```

---

## 5. Permission Tests

| Role | Action | Expected | Test ID |
|------|--------|----------|---------|
| Sales Rep | Create activity | 201 | activities-int-01 |
| Sales Rep | View own tasks | 200 | activities-int-05 |
| Sales Rep | Edit another's activity | 403 | activities-int-07 |
| Manager | View all org activities | 200 | activities-int-06 |
