# Feature Review: Auth & User Management

**Reviewed**: 2026-06-13
**Result**: ✅ Approved (1 blocking issue fixed during review; 5 advisory items remain)

---

## Spec compliance

### Backend — Controller / Routes

All 11 endpoints from api-spec.md are implemented in routes.ts with correct HTTP methods and paths:

| Endpoint | Implemented | Method | Auth |
|----------|-------------|--------|------|
| POST /api/auth/signup | ✅ | ✅ | ✅ public |
| POST /api/auth/login | ✅ | ✅ | ✅ public |
| POST /api/auth/logout | ✅ | ✅ | ✅ authenticate |
| POST /api/auth/forgot-password | ✅ | ✅ | ✅ public |
| POST /api/auth/reset-password | ✅ | ✅ | ✅ public |
| POST /api/auth/accept-invite | ✅ | ✅ | ✅ public |
| GET /api/users | ✅ | ✅ | ✅ admin only |
| POST /api/users/invite | ✅ | ✅ | ✅ admin only |
| POST /api/users/:id/resend-invite | ✅ | ✅ | ✅ admin only |
| PUT /api/users/:id | ✅ | ✅ | ✅ admin only |
| DELETE /api/users/:id | ✅ | ✅ | ✅ admin only |

Response envelopes: all success responses wrapped in `{ data }` or `{ data, pagination }` ✅

HTTP status codes:
- signup → 201 ✅ (controller.ts:22)
- inviteUser → 201 ✅ (controller.ts:81)
- All other success → 200 ✅
- 409/401/403/422/404 error codes map correctly ✅

Error messages match feature-spec.md error cases exactly ✅

### Backend — Service (Business Rules)

| BR | Rule | Enforced |
|----|------|----------|
| BR-01 | Org must always have at least one Admin | ✅ deactivateUser() + updateUser() in service.ts |
| BR-02 | Admin cannot deactivate themselves if last admin | ✅ deactivateUser():324 (self-check) + :334 (general guard) |
| BR-03 | Invite links expire after 72 hours | ✅ INVITE_TTL_MS = 72*60*60*1000, acceptInvite():172 |
| BR-04 | Passwords at least 8 characters | ✅ schemas.ts signupSchema + resetPasswordSchema + acceptInviteSchema |
| BR-05 | Email unique per organisation | ✅ inviteUser():214 via findUserByEmailInOrg |
| BR-06 | Deactivated user cannot log in | ✅ login():100 checks user.status === 'deactivated' |
| BR-07 | Reset tokens expire after 1 hour | ✅ RESET_TTL_MS = 60*60*1000, resetPassword():152 |
| BR-08 | organisation_id always from JWT | ✅ all service functions use caller.organizationId |

RBAC: authorize('admin') middleware on all user management routes ✅

### Backend — Repository / Schema

All db-spec.md fields present in Drizzle schema:

**organizations.ts**: id UUID PK, name VARCHAR(255), slug VARCHAR(100), created_at, updated_at, deleted_at ✅

**users.ts**: all 16 fields match db-spec.md types and nullability ✅. Indexes:
- users_org_idx on organization_id ✅
- users_email_org_idx on (organization_id, email) ✅

**⚠️ Issue 1** — `backend/src/db/schema/users.ts:26` / `backend/drizzle/0000_common_venus.sql`
db-spec.md Section 4 requires: _"Composite UNIQUE: `(organization_id, email)` WHERE `deleted_at IS NULL`"_
Implementation uses a plain **index**, not a UNIQUE constraint. The uniqueness is enforced only at the service layer (findUserByEmailInOrg check before insert). A race condition under concurrent requests could allow duplicate entries.
→ Add partial unique index via raw SQL migration: `CREATE UNIQUE INDEX users_email_org_unique ON users(organization_id, email) WHERE deleted_at IS NULL`

**⚠️ Issue 2** — `backend/src/db/schema/organizations.ts`
db-spec.md Section 4 requires: _"Partial UNIQUE on `organizations.slug` WHERE `deleted_at IS NULL`"_
Not implemented; slug uniqueness enforced only at service layer via timestamp suffix.
→ Add: `CREATE UNIQUE INDEX organizations_slug_unique ON organizations(slug) WHERE deleted_at IS NULL`

### Frontend — Pages / Components

| Page | Exists | Loading | Error | Empty | Role guard |
|------|--------|---------|-------|-------|------------|
| LoginPage | ✅ | ✅ | ✅ inline | n/a | n/a |
| SignupPage | ✅ | ✅ | ✅ inline | n/a | n/a |
| ForgotPasswordPage | ✅ | ✅ | ✅ | n/a | n/a |
| ResetPasswordPage | ✅ | ✅ | ✅ | n/a | n/a |
| AcceptInvitePage | ✅ | ✅ | ✅ | n/a | n/a |
| UsersPage | ✅ | ✅ spinner | ✅ | ⚠️ | ✅ redirect to /deals |

**⚠️ Issue 3** — `frontend/src/features/auth/pages/UsersPage.tsx:133`
When `users.length === 0` the table renders with an empty tbody but no empty state message or component. ui-spec.md calls for a proper empty state. (Minor — a fresh org always has ≥ 1 user, but the component should handle it.)

UsersPage table columns: Name, Email, Role (badge), Status (badge), Actions (kebab) ✅
Kebab actions: Change role, Deactivate, Resend invite, Reactivate — all rendered conditionally ✅
Last-admin guard on deactivate button: disabled + tooltip ✅ (ui-spec.md explicitly requires disabled state here)
Non-admin redirect: `if (!authUser || authUser.role !== 'admin') return <Navigate to="/deals">` ✅

---

## Security invariants

### Multi-tenancy ✅ (with one design note)

All repository queries correctly scope by organizationId:
- findUserByEmailInOrg ✅, findUserById ✅, countActiveAdmins ✅, findManyUsers ✅, updateUser ✅, softDeleteUser ✅

**Design note** — `backend/src/modules/auth-user-management/repository.ts:62,71`
`findUserByInviteToken()` and `findUserByResetToken()` do not filter by organizationId. The security spec says "no exceptions", but the auth flow requires looking up a user by token before the org is known. The token is `crypto.randomBytes(32)` (256-bit) — effectively unguessable. This is an acceptable design trade-off for the auth module but technically violates the strict rule. Can be hardened post-MVP by adding org verification after token lookup (requires caller to supply an org hint).

### Soft delete ✅

Zero `DELETE FROM` statements found. All writes use:
- `repo.softDeleteUser()`: `UPDATE users SET deleted_at = NOW()` ✅
- Every SELECT has `isNull(users.deletedAt)` in the WHERE clause ✅ (verified across all 7 read functions)

### Auth ✅

- `authenticate` preHandler on all protected routes ✅
- Public endpoints have no preHandler ✅
- `authorize('admin')` on all user management endpoints ✅

### Role checks ✅

Role checks via `authorize()` middleware in routes.ts; fine-grained last-admin guard in service.ts; no hardcoded role strings in frontend (uses `authUser.role` from useAuth()) ✅

### Data exposure ✅

`sanitizeUser()` (service.ts:44) strips `passwordHash`, `inviteToken`, `passwordResetToken` from all responses. All service functions return `sanitizeUser(user)` ✅

Note: `console.info` logs invite and reset tokens in development mode (service.ts:239, 265). Acceptable for MVP with SMTP TODO; must be removed before production.

### Input safety ✅

All queries use Drizzle ORM parameterized queries. No raw SQL string interpolation in repository.ts ✅

---

## Test coverage

### AC coverage — all 12 ACs covered

| AC | Unit | Integration | E2E | Notes |
|----|------|-------------|-----|-------|
| AC-01 | auth-unit-01, 03 | auth-int-01, 02 | auth-e2e-01 | ✅ |
| AC-02 | auth-unit-02 | — | auth-e2e-02 | ✅ |
| AC-03 | auth-unit-09, 10 | auth-int-07 | auth-e2e-15 | ✅ |
| AC-04 | auth-unit-11 | auth-int-10 | auth-e2e-24 | ✅ |
| AC-05 | auth-unit-12, 13 | auth-int-05 | auth-e2e-24 | ✅ |
| AC-06 | auth-unit-04 | auth-int-03, 08 | auth-e2e-05 | ✅ |
| AC-07 | auth-unit-05, 07 | auth-int-04 | auth-e2e-06 | ✅ |
| AC-08 | auth-unit-06 | — | — | ✅ E2E omitted — requires deactivated account setup via API |
| AC-09 | auth-unit-16 | auth-int-19 | auth-e2e-18 | ✅ |
| AC-10 | auth-unit-23–25 | — | auth-e2e-11 | ✅ E2E covers form only; reset link click is email-dependent |
| AC-11 | auth-unit-17 | auth-int-20, 21 | auth-e2e-17 | ✅ |
| AC-12 | auth-unit-20, 21 | — | auth-e2e-20 | ✅ unit/E2E pass; **UI bug noted in Required Changes** |

### BR coverage ✅

All 8 BRs have unit or integration test coverage (see test-spec.md Section 5).

### Permission coverage ✅

Multi-tenancy isolation tested: auth-int-06, 09, 12, 18, 21 (org A invisible to org B for all read/write paths)
Soft delete tests: auth-int-17 (record gone from query, still physically in DB), auth-int-10, 16

### Form validation E2E ✅

Covered: signup (auth-e2e-03, 04), login (auth-e2e-07), forgot-password (auth-e2e-12), invite modal (auth-e2e-16), accept-invite (auth-e2e-25, 26), 409 conflict inline (auth-e2e-21)

---

## Code quality

### TypeScript

- service.ts, repository.ts, controller.ts, schemas.ts: zero `any` types ✅
- frontend api.ts, hooks, types.ts: zero `any` types ✅
- All function parameters and return types explicitly typed ✅

**⚠️ Issue 4** — `backend/src/modules/auth-user-management/service.ts:96,106,111`
`throw new Error('UNAUTHORIZED')` is used in 3 places in `login()`. This is an untyped sentinel string caught by a special case in the error handler (app.ts:21). There is no `UnauthorizedError` class in `errors.ts`.
→ Add `UnauthorizedError` to errors.ts; replace the 3 sentinel throws with typed instances.

### Layer separation ✅

- controller.ts: zero business logic — only parses request, calls service, formats response ✅
- service.ts: zero DB queries — all DB access via repo.* calls ✅
- repository.ts: zero business logic — only Drizzle queries ✅
- routes.ts: zero logic — only registration and schema attachment ✅

### Frontend patterns ✅

- No hardcoded API URLs — all go through `src/lib/api.ts` Axios instance ✅
- No direct `fetch()` calls ✅
- Role checks via `useAuth()` ✅
- Zod schemas in `schemas.ts` match api-spec.md request bodies exactly ✅

### Error handling

- ConflictError, NotFoundError, ForbiddenError, UnprocessableError used throughout service.ts ✅
- Error handler in app.ts maps typed error classes to correct HTTP codes ✅
- See Issue 4 above for untyped UNAUTHORIZED sentinel ⚠️

### Naming ✅

- Module folder: `auth-user-management` matches feature slug ✅
- File names: routes.ts, controller.ts, service.ts, repository.ts, schemas.ts ✅
- Frontend components: PascalCase ✅; hooks: `use*` prefix ✅

---

## Required changes before merge

### Blocking (fixed during review)

**1. ✅ FIXED — Resend invite button was a no-op in UsersPage**
- **File**: `frontend/src/features/auth/pages/UsersPage.tsx`
- **Spec**: AC-12 — "When an Admin clicks 'Resend invite', a new 72-hour invite token replaces the old one"
- **Was**: onClick handler closed the menu but did not call `resendInvite.mutate()`. `UsersPage` only destructured `{ updateUser, deactivate }`.
- **Fixed**: Added `resendInvite` to the destructure and wired `resendInvite.mutate(user.id)` to the button onClick.

---

### Advisory (non-blocking — address before production)

**2. Missing partial unique index: users (organization_id, email)**
- `backend/src/db/schema/users.ts` / `backend/drizzle/0000_common_venus.sql`
- db-spec.md Section 4 requires `UNIQUE (organization_id, email) WHERE deleted_at IS NULL`
- Current: plain index, not unique — service-layer check prevents duplicates but not race-condition-safe
- Fix: add raw SQL migration with `CREATE UNIQUE INDEX users_email_org_unique ON users(organization_id, email) WHERE deleted_at IS NULL`

**3. Missing partial unique index: organizations (slug)**
- `backend/src/db/schema/organizations.ts`
- db-spec.md Section 4 requires `UNIQUE (slug) WHERE deleted_at IS NULL`
- Fix: add raw SQL migration for slug uniqueness

**4. Untyped UNAUTHORIZED sentinel in service.ts**
- `backend/src/modules/auth-user-management/service.ts:96,106,111`
- `throw new Error('UNAUTHORIZED')` — no typed error class; relies on string matching in app.ts
- Fix: add `UnauthorizedError` to `backend/src/lib/errors.ts` (statusCode = 401), replace 3 sentinel throws

**5. Empty state missing on UsersPage**
- `frontend/src/features/auth/pages/UsersPage.tsx:133`
- When `users.length === 0`, table renders empty tbody with no message
- Fix: add an empty state row or component ("No team members found")

**6. Console.info token logging**
- `backend/src/modules/auth-user-management/service.ts:239,265`
- Invite and reset tokens are logged to stdout in development
- Acceptable for MVP; must be replaced with SMTP before production deployment
