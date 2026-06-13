# Test Spec: Contact Management

---

## 1. Coverage Map

| AC # | Criterion | Unit | Integration | E2E |
|------|-----------|------|-------------|-----|
| AC-01 | Create contact with name only | ✅ | ✅ | ✅ |
| AC-02 | Email uniqueness enforced | ✅ | ✅ | ✅ |
| AC-03 | Contact list scoped to org | ✅ | ✅ | ✅ |
| AC-04 | Sales Rep sees own contacts | ✅ | ✅ | ✅ |
| AC-05 | Manager sees all contacts | ✅ | ✅ | ✅ |
| AC-06 | Search by name | ✅ | ✅ | ✅ |
| AC-07 | Link contact to company | ✅ | ✅ | ✅ |
| AC-08 | Soft delete | ✅ | ✅ | ✅ |
| AC-09 | Reassign owner | ✅ | ✅ | ✅ |
| AC-10 | Contact detail shows related records | ❌ | ✅ | ✅ |

---

## 2. Unit Tests

**File**: `backend/src/modules/contacts/__tests__/contacts.service.test.ts`

```
ContactService
  create()
    ✅ contacts-unit-01: creates contact with name only (no email)
    ✅ contacts-unit-02: creates contact with all fields
    ✅ contacts-unit-03: throws ConflictError for duplicate email in org
    ✅ contacts-unit-04: sets owner_id to caller's user ID

  list()
    ✅ contacts-unit-05: sales rep only sees own contacts
    ✅ contacts-unit-06: manager sees all org contacts
    ✅ contacts-unit-07: excludes soft-deleted contacts

  update()
    ✅ contacts-unit-08: owner can update their contact
    ✅ contacts-unit-09: throws ForbiddenError when sales rep edits another's contact
    ✅ contacts-unit-10: manager can edit any contact

  delete()
    ✅ contacts-unit-11: admin can soft-delete
    ✅ contacts-unit-12: throws ForbiddenError for non-admin delete
```

---

## 3. Integration Tests

**File**: `backend/src/modules/contacts/__tests__/contacts.repository.test.ts`

```
GET /api/contacts
  ✅ contacts-int-01: returns paginated list for authenticated user
  ✅ contacts-int-02: org isolation — org B cannot see org A contacts
  ✅ contacts-int-03: soft-deleted contacts not returned
  ✅ contacts-int-04: search by partial name

POST /api/contacts
  ✅ contacts-int-05: returns 201 for valid body
  ✅ contacts-int-06: returns 409 for duplicate email in org
  ✅ contacts-int-07: returns 400 for missing first_name

PUT /api/contacts/:id
  ✅ contacts-int-08: owner can update
  ✅ contacts-int-09: returns 403 when sales rep edits another's contact

DELETE /api/contacts/:id
  ✅ contacts-int-10: admin soft-deletes; contact not in list
  ✅ contacts-int-11: record still in DB with deleted_at set
  ✅ contacts-int-12: returns 403 for non-admin
```

---

## 4. E2E Tests (Playwright)

**File**: `e2e/contacts.spec.ts`

```
AC-01: Create contact
  ✅ contacts-e2e-01: sales rep creates contact with name only; appears in list

AC-02: Duplicate email
  ✅ contacts-e2e-02: duplicate email shows inline conflict error

AC-04: Own contacts only
  ✅ contacts-e2e-03: sales rep cannot see other rep's contacts in list

AC-08: Soft delete
  ✅ contacts-e2e-04: admin deletes contact; disappears from list
```

---

## 5. Permission Tests

| Role | Action | Expected | Test ID |
|------|--------|----------|---------|
| Sales Rep | Create contact | 201 | contacts-int-05 |
| Sales Rep | Edit own contact | 200 | contacts-int-08 |
| Sales Rep | Edit another's contact | 403 | contacts-int-09 |
| Admin | Delete contact | 200 | contacts-int-10 |
| Manager | Delete contact | 403 | contacts-int-12 |
| Sales Rep | Delete contact | 403 | contacts-int-12 |

---

## 6. Test Environment

| Requirement | Value |
|-------------|-------|
| Database | Neon test DB |
| Auth tokens | `createTestToken(role)` |
| Cleanup | `afterAll: cleanupOrg(orgId)` |
