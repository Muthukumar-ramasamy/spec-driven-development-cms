# Test Spec: Company Management

---

## 1. Coverage Map

| AC # | Criterion | Unit | Integration | E2E |
|------|-----------|------|-------------|-----|
| AC-01 | Create company | ✅ | ✅ | ✅ |
| AC-02 | Name unique per org | ✅ | ✅ | ✅ |
| AC-03 | List scoped to org | ✅ | ✅ | ✅ |
| AC-04 | Detail shows contacts | ❌ | ✅ | ✅ |
| AC-05 | Detail shows activities | ❌ | ✅ | ✅ |
| AC-06 | Soft delete | ✅ | ✅ | ✅ |
| AC-07 | Contacts unlinked on delete | ✅ | ✅ | ✅ |

---

## 2. Unit Tests

**File**: `backend/src/modules/companies/__tests__/companies.service.test.ts`

```
CompanyService
  create()
    ✅ companies-unit-01: creates with valid data
    ✅ companies-unit-02: throws ConflictError for duplicate name in org

  list()
    ✅ companies-unit-03: all roles see all org companies
    ✅ companies-unit-04: excludes soft-deleted

  delete()
    ✅ companies-unit-05: admin soft-deletes
    ✅ companies-unit-06: throws ForbiddenError for non-admin
    ✅ companies-unit-07: linked contacts have company_id set to null
```

---

## 3. Integration Tests

**File**: `backend/src/modules/companies/__tests__/companies.repository.test.ts`

```
POST /api/companies
  ✅ companies-int-01: returns 201 for valid body
  ✅ companies-int-02: returns 409 for duplicate name

GET /api/companies
  ✅ companies-int-03: org isolation — org B cannot see org A companies

DELETE /api/companies/:id
  ✅ companies-int-04: admin soft-deletes; contacts unlinked (company_id = null)
  ✅ companies-int-05: returns 403 for non-admin
```

---

## 4. E2E Tests (Playwright)

**File**: `e2e/companies.spec.ts`

```
  ✅ companies-e2e-01: create company; appears in list
  ✅ companies-e2e-02: duplicate name shows conflict error
  ✅ companies-e2e-03: admin deletes company; disappears from list
```

---

## 5. Permission Tests

| Role | Action | Expected | Test ID |
|------|--------|----------|---------|
| Sales Rep | Create company | 201 | companies-int-01 |
| Sales Rep | Edit another's company | 403 | companies-int-06 |
| Admin | Delete company | 200 | companies-int-04 |
| Manager | Delete company | 403 | companies-int-05 |
