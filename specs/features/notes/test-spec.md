# Test Spec: Notes

---

## 1. Coverage Map

| AC # | Criterion | Unit | Integration | E2E |
|------|-----------|------|-------------|-----|
| AC-01 | Create note linked to record | ✅ | ✅ | ✅ |
| AC-02 | Note must link to at least one record | ✅ | ✅ | ✅ |
| AC-03 | Author can edit own note | ✅ | ✅ | ✅ |
| AC-04 | Non-author cannot edit note | ✅ | ✅ | ✅ |
| AC-05 | Author can delete own note | ✅ | ✅ | ✅ |
| AC-06 | Non-author non-admin cannot delete | ✅ | ✅ | ✅ |
| AC-07 | Admin can delete any note | ✅ | ✅ | ✅ |
| AC-08 | Pin note | ✅ | ✅ | ✅ |

---

## 2. Unit Tests

**File**: `backend/src/modules/notes/__tests__/notes.service.test.ts`

```
NoteService
  create()
    ✅ notes-unit-01: creates note with deal link; author_id set to caller
    ✅ notes-unit-02: throws ValidationError for no linked record

  update()
    ✅ notes-unit-03: author can edit own note
    ✅ notes-unit-04: throws ForbiddenError for non-author non-admin

  delete()
    ✅ notes-unit-05: author can soft-delete own note
    ✅ notes-unit-06: throws ForbiddenError for non-author non-admin
    ✅ notes-unit-07: admin can delete any note
```

---

## 3. Integration Tests

**File**: `backend/src/modules/notes/__tests__/notes.repository.test.ts`

```
POST /api/notes
  ✅ notes-int-01: returns 201 for valid note
  ✅ notes-int-02: returns 400 for no linked record

PUT /api/notes/:id
  ✅ notes-int-03: author can update; 200
  ✅ notes-int-04: non-author returns 403

DELETE /api/notes/:id
  ✅ notes-int-05: author soft-deletes; 200; note not in list
  ✅ notes-int-06: admin soft-deletes another's note; 200
  ✅ notes-int-07: non-author non-admin returns 403
```

---

## 4. E2E Tests (Playwright)

**File**: `e2e/notes.spec.ts`

```
  ✅ notes-e2e-01: add note to deal; appears in Notes tab
  ✅ notes-e2e-02: pin note; appears at top of list
  ✅ notes-e2e-03: author edits own note; content updated
  ✅ notes-e2e-04: non-author does not see edit/delete on another's note
  ✅ notes-e2e-05: admin can delete any note
```

---

## 5. Permission Tests

| Role | Action | Expected | Test ID |
|------|--------|----------|---------|
| Sales Rep | Create note | 201 | notes-int-01 |
| Author | Edit own note | 200 | notes-int-03 |
| Non-author | Edit another's note | 403 | notes-int-04 |
| Author | Delete own note | 200 | notes-int-05 |
| Admin | Delete any note | 200 | notes-int-06 |
| Non-author, non-admin | Delete another's note | 403 | notes-int-07 |
