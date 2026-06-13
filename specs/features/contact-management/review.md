# Feature Review: ContactManagement

**Reviewed**: 2026-06-13
**Result**: ⚠️ Needs changes

---

## Spec compliance

### Backend

**Routes / Controller** — all checks passed ✅
- All 5 endpoints from api-spec.md present in routes.ts: `GET /contacts`, `POST /contacts`, `GET /contacts/:id`, `PUT /contacts/:id`, `DELETE /contacts/:id`
- No extra endpoints outside the spec
- HTTP methods, paths, and response envelopes all match
- Validation: `createContactSchema`, `updateContactSchema`, `listContactsQuerySchema` applied in controller.ts before service call
- Status codes correct: 201 POST create, 200 GET/PUT, 204 DELETE, 400/403/404/409 via typed error classes → global error handler

**Service** — 1 gap found ⚠️

All BRs enforced:
- BR-01 (email unique per org): `findByEmail` check in `createContact` and `updateContact` (service.ts:22-25, 86-90)
- BR-02 (soft delete only): `repo.softDelete` in `deleteContact` (service.ts:118)
- BR-03 (sales rep edits own only): ownership check in `updateContact` (service.ts:75-77)
- BR-04 (sales rep scoped to own contacts): `ownerId` forced in `listContacts` (service.ts:9)
- BR-05 (org scoping): `caller.organizationId` always passed to repo, never from body/params

Gap:
- **⚠️ Issue 1**: feature-spec.md Error Cases lists `company_id references non-existent company → 400 "Invalid company ID."` but [service.ts](backend/src/modules/contact-management/service.ts) has no check for this. Deferred until CompanyManagement module is implemented.

**Repository / Schema** — 2 issues found ⚠️

Fields:
- All required fields present in [contacts.ts](backend/src/db/schema/contacts.ts): id, organization_id, first_name, last_name, email, phone, job_title, company_id, owner_id, source, created_at, updated_at, deleted_at
- `linkedin_url` present in schema (aligns with feature-spec.md section 7, acceptable addition)
- **⚠️ Issue 2**: [db-spec.md](specs/features/contact-management/db-spec.md) lists `notes: TEXT` as a field on contacts. [contacts.ts](backend/src/db/schema/contacts.ts) omits it. Notes are stored in a separate Notes entity (Module 7), which is the correct architecture — but db-spec.md was not updated to reflect this. Either the db-spec.md `notes` row should be removed, or a note should be added stating it lives in the `notes` table.

Indexes:
- `contacts_org_idx`, `contacts_owner_idx`, `contacts_company_idx`, `contacts_deleted_at_idx` — all present ✅
- Partial unique index `(organization_id, email) WHERE deleted_at IS NULL AND email IS NOT NULL` — correctly defined in [20260613000002_create_contacts.sql](backend/drizzle/20260613000002_create_contacts.sql:22-24) ✅
- **⚠️ Issue 3**: [contacts.ts:35](backend/src/db/schema/contacts.ts#L35) uses `index()` for `emailOrgIdx` instead of `uniqueIndex()`. Drizzle ORM does not support partial indexes natively, so the partial unique constraint can only live in the migration SQL — which is correctly placed. App-level enforcement via `findByEmail` in service.ts provides a second layer. Add a code comment on the index explaining this.

Soft delete column: `deletedAt` present, nullable (no `.notNull()`) ✅

### Frontend — 1 issue found ⚠️

- Contacts list columns: Name (Avatar + text), Email, Phone, Job title, Owner (Chip) ✅
- Search bar (TextField) ✅
- Owner filter shown for admin/manager only (`canFilterByOwner` check in ContactsPage.tsx:42) ✅
- "New contact" opens right-side Drawer ✅
- Row click navigates to `/contacts/:id` ✅
- Delete in kebab menu hidden for non-admin (`authUser?.role === 'admin'` in ContactTable.tsx:107) ✅
- Loading: CircularProgress ✅
- Error: Alert severity="error" ✅
- Empty state: "No contacts found" + "Add your first contact" button ✅
- Detail page: two-panel Grid (info left, tabs right), breadcrumbs, edit button, admin-only delete button ✅

Gap:
- **⚠️ Issue 4**: [ui-spec.md](specs/features/contact-management/ui-spec.md) line 28 specifies "Edit fields inline; save button appears on change" for the contact detail page. The implementation uses a ContactForm right-side Drawer instead. [feature-spec.md section 9](specs/features/contact-management/feature-spec.md) specifies "right-side create drawer" which aligns with the implementation. The ui-spec.md is internally inconsistent with the feature-spec on this point. Recommend updating ui-spec.md to match the drawer pattern.

---

## Security invariants

✅ All invariants passed — no blocking violations.

**Multi-tenancy** — all repository functions include `organization_id` scope:
| Function | Clause | File |
|----------|--------|------|
| `findMany` | `eq(contacts.organizationId, organizationId)` | repository.ts:24 |
| `findById` | `eq(contacts.organizationId, organizationId)` | repository.ts:92-94 |
| `findByEmail` | `eq(contacts.organizationId, organizationId)` | repository.ts:107 |
| `create` | `organizationId` from `caller.organizationId` (JWT) | service.ts:32 |
| `update` | `eq(contacts.organizationId, organizationId)` | repository.ts:134-136 |
| `softDelete` | `eq(contacts.organizationId, organizationId)` | repository.ts:150-152 |

`organizationId` sourced only from `getJwtPayload(req)` in controller.ts — never from `req.body` or `req.params` ✅

**Soft delete** — zero `DELETE FROM` statements. Every `SELECT` includes `isNull(contacts.deletedAt)`. `softDelete` uses `UPDATE SET deletedAt = new Date()` ✅

**Auth** — `authenticate` preHandler on all 5 routes ✅

**Role checks** — all in service.ts, none in routes.ts or controller.ts ✅

**Data exposure** — no `password_hash`, `invite_token`, or `reset_token` in any response or log call ✅

**Input safety** — Drizzle ORM used throughout. `sql<string>` template literals in `enrichedFields` (repository.ts:51-52) reference only column identifiers, never user input ✅

---

## Test coverage

⚠️ 1 gap — AC-07 undercovered (with written justification).

**AC coverage**:
| AC | Description | Gap |
|----|-------------|-----|
| AC-01 | Create with name only | ✅ |
| AC-02 | Email uniqueness | ✅ |
| AC-03 | List scoped to org | ✅ |
| AC-04 | Sales rep sees own | ✅ |
| AC-05 | Manager sees all | ✅ |
| AC-06 | Search by name | ✅ |
| AC-07 | Link to company | ⚠️ Skipped — Company Management not yet implemented. Documented in test-spec.md with explanation. Will be covered in CompanyManagement E2E suite. |
| AC-08 | Soft delete | ✅ |
| AC-09 | Reassign owner | ✅ (smoke test) |
| AC-10 | Detail shows related records | ✅ |

**BR coverage**: BR-01 through BR-05 — all have unit + integration tests ✅

**Permission coverage**: All 10 permission rows have both ALLOWED and DENIED tests ✅

**Multi-tenancy isolation**: `contacts-int-02` (list) and `contacts-int-get-org-isolation` (GET /:id) ✅

**Soft delete**: `contacts-int-10` (not in list) and `contacts-int-11` (still in DB with `deleted_at` set) ✅

**Form validation E2E**: `contacts-e2e-form-required` (empty required field) and `contacts-e2e-02` (409 inline conflict) ✅

---

## Code quality

✅ All checks passed.

**TypeScript**: Zero `any` in service.ts, repository.ts, controller.ts, frontend hooks, api.ts, types.ts ✅

**Layer separation**:
- `routes.ts`: registers routes only, no logic ✅
- `controller.ts`: parse → call service → send response, no business logic ✅
- `service.ts`: all business logic, calls `repo.*` only, no Drizzle queries ✅
- `repository.ts`: all Drizzle queries, no business logic ✅

**Frontend patterns**: all API calls via `api` instance from `lib/api.ts`, no `fetch()`, all role checks via `useAuth()` ✅

**Error handling**: `ConflictError`, `ForbiddenError`, `NotFoundError` used throughout; no untyped `throw new Error(...)` in service.ts; global error handler in app.ts maps `statusCode` property ✅

**Naming**: module folder `contact-management`, files follow `routes.ts / controller.ts / service.ts / repository.ts / schemas.ts` convention, components PascalCase, hooks prefixed with `use` ✅

---

## Required changes before merge

None are blocking (no multi-tenancy violations, no hard deletes, no TypeScript `any`). AC-07 gap has a written justification. The four items below should be addressed before or alongside the CompanyManagement feature.

1. **[Issue 1]** Add `company_id` validation to [service.ts](backend/src/modules/contact-management/service.ts) once CompanyManagement is implemented: check that the provided `companyId` exists in the org, throw `400 "Invalid company ID."` if not. Spec reference: feature-spec.md Error Cases.

2. **[Issue 2]** Update [db-spec.md](specs/features/contact-management/db-spec.md) to remove the `notes: TEXT` row from the Key Fields table, or add a note: "Notes stored in `notes` table (Module 7), not as a direct field on contacts." Spec reference: db-spec.md Key Fields vs. Module 7 architecture.

3. **[Issue 3]** Add a comment to [contacts.ts:35](backend/src/db/schema/contacts.ts#L35) explaining why `index()` is used instead of `uniqueIndex()`: partial unique constraint is enforced by migration SQL only (Drizzle ORM does not support partial indexes natively). Spec reference: db-spec.md Critical Constraints.

4. **[Issue 4]** Update [ui-spec.md](specs/features/contact-management/ui-spec.md) to replace "Edit fields inline; save button appears on change" with the correct UX: "Edit button opens a right-side Drawer (ContactForm)." Spec reference: feature-spec.md section 9 "right-side create drawer."
