# Test Spec: Auth & User Management

---

## 1. Coverage Map

| AC # | Criterion | Unit | Integration | E2E |
|------|-----------|------|-------------|-----|
| AC-01 | Workspace creation (signup) | auth-unit-01, auth-unit-03 | auth-int-01, auth-int-02 | auth-e2e-01 |
| AC-02 | Duplicate signup email | auth-unit-02 | — | auth-e2e-02 |
| AC-03 | Invite sent | auth-unit-09, auth-unit-10 | auth-int-07 | auth-e2e-15 |
| AC-04 | Invite accepted | auth-unit-11 | auth-int-10 | auth-e2e-24 |
| AC-05 | Expired invite rejected | auth-unit-12, auth-unit-13 | auth-int-05 | auth-e2e-24 |
| AC-06 | Login with valid credentials | auth-unit-04 | auth-int-03, auth-int-08 | auth-e2e-05 |
| AC-07 | Login with invalid credentials | auth-unit-05, auth-unit-07 | auth-int-04 | auth-e2e-06 |
| AC-08 | Deactivated user blocked | auth-unit-06 | — | — |
| AC-09 | Deactivate blocked — last admin | auth-unit-16 | auth-int-19 | auth-e2e-18 |
| AC-10 | Password reset flow | auth-unit-23, auth-unit-24, auth-unit-25 | — | auth-e2e-11 (partial — no email) |
| AC-11 | Role change | auth-unit-17 | auth-int-20, auth-int-21 | auth-e2e-17 |
| AC-12 | Resend invite | auth-unit-20, auth-unit-21 | — | auth-e2e-20 |

---

## 2. Unit Tests

**File**: `backend/src/modules/auth-user-management/__tests__/auth-user-management.service.test.ts`

```
AuthService
  signup()
    ✅ auth-unit-01: creates org and admin user with valid inputs
    ✅ auth-unit-02: throws ConflictError for duplicate email
    ✅ auth-unit-03: returns JWT and sanitized user on success

  login()
    ✅ auth-unit-04: returns user and token for valid credentials
    ✅ auth-unit-05: throws UNAUTHORIZED for wrong password
    ✅ auth-unit-06: throws ForbiddenError for deactivated user
    ✅ auth-unit-07: throws NotFoundError for unknown email
    ✅ auth-unit-08: throws ForbiddenError for pending user

  inviteUser()
    ✅ auth-unit-09: creates pending user with invite token
    ✅ auth-unit-10: throws ConflictError for existing email in org

  acceptInvite()
    ✅ auth-unit-11: activates account, clears token, returns JWT
    ✅ auth-unit-12: throws UnprocessableError for expired token
    ✅ auth-unit-13: throws NotFoundError for invalid token

  deactivateUser()
    ✅ auth-unit-14: sets status to deactivated
    ✅ auth-unit-15: throws NotFoundError for unknown user
    ✅ auth-unit-16: throws UnprocessableError when deactivating last admin (BR-01, BR-02)

  updateUser()
    ✅ auth-unit-17: updates role successfully
    ✅ auth-unit-18: throws UnprocessableError when downgrading last admin role (BR-01)
    ✅ auth-unit-19: throws NotFoundError for unknown user

  resendInvite()
    ✅ auth-unit-20: generates new token for pending user
    ✅ auth-unit-21: throws NotFoundError for non-pending user
    ✅ auth-unit-22: throws NotFoundError for unknown user

  resetPassword()
    ✅ auth-unit-23: updates password for valid token (BR-07)
    ✅ auth-unit-24: throws UnprocessableError for expired token
    ✅ auth-unit-25: throws UnprocessableError for invalid token

  forgotPassword()
    ✅ auth-unit-26: returns {} regardless of email existence (privacy-safe)
    ✅ auth-unit-27: returns {} for unknown email
```

---

## 3. Integration Tests

**File**: `backend/src/modules/auth-user-management/__tests__/auth-user-management.repository.integration.test.ts`

```
repo.createOrganization
  ✅ auth-int-01: creates organization with id, name, slug

repo.createUser
  ✅ auth-int-02: creates user with correct fields and UUID PK

repo.findUserByEmailGlobal
  ✅ auth-int-03: finds user by email across orgs
  ✅ auth-int-04: returns undefined for unknown email
  ✅ auth-int-05: does not return soft-deleted user

repo.findUserByEmailInOrg  (multi-tenancy)
  ✅ auth-int-06: org B cannot see org A user by email
  ✅ auth-int-07: finds user within the correct org

repo.findUserById
  ✅ auth-int-08: returns user when id and org match
  ✅ auth-int-09: org B cannot access org A user by id (multi-tenancy)
  ✅ auth-int-10: returns undefined after soft delete

repo.findManyUsers
  ✅ auth-int-11: returns all users in org
  ✅ auth-int-12: only returns users from the requested org (multi-tenancy)
  ✅ auth-int-13: filters by role
  ✅ auth-int-14: filters by status
  ✅ auth-int-15: pagination — page 2 returns remaining records
  ✅ auth-int-16: soft-deleted users not included in list

repo.softDeleteUser
  ✅ auth-int-17: sets deleted_at; record still physically exists in DB
  ✅ auth-int-18: cannot soft-delete user from another org (multi-tenancy)

repo.countActiveAdmins
  ✅ auth-int-19: counts only active admins, not deactivated or other roles (BR-01)

repo.updateUser
  ✅ auth-int-20: updates role and returns updated record
  ✅ auth-int-21: cannot update user from another org (multi-tenancy)
```

---

## 4. E2E Tests (Playwright)

**File**: `e2e/auth-user-management.spec.ts`

```
Signup
  ✅ auth-e2e-01: AC-01 — new org signup creates workspace, redirects to /deals
  ✅ auth-e2e-02: AC-02 — duplicate email shows 409 error message
  ✅ auth-e2e-03: signup form validation — required fields show inline errors
  ✅ auth-e2e-04: signup — password too short shows inline error (BR-04)

Login
  ✅ auth-e2e-05: AC-06 — valid credentials log in and redirect to /deals
  ✅ auth-e2e-06: AC-07 — wrong password shows 401 error message
  ✅ auth-e2e-07: login form validation — empty submit shows inline errors
  ✅ auth-e2e-08: already-logged-in user visiting /login redirected to /deals

Logout
  ✅ auth-e2e-09: logout clears session and redirects to /login
  ✅ auth-e2e-10: after logout, protected page redirects to /login

Forgot Password
  ✅ auth-e2e-11: AC-10 — forgot-password form shows confirmation message
  ✅ auth-e2e-12: forgot-password validation — empty email shows inline error
  ✅ auth-e2e-13: reset-password page — shows error when no token in URL

Team Members — Admin
  ✅ auth-e2e-14: team members page loads and shows current admin user
  ✅ auth-e2e-15: AC-03 — invite modal opens and submits new member invite
  ✅ auth-e2e-16: invite modal validation — empty email shows inline error
  ✅ auth-e2e-17: AC-11 — change role from sales_rep to manager via kebab menu
  ✅ auth-e2e-18: AC-09 — deactivate last admin button is disabled (BR-01, BR-02)
  ✅ auth-e2e-19: deactivate confirmation dialog appears before action
  ✅ auth-e2e-20: AC-12 — resend invite option visible for pending users
  ✅ auth-e2e-21: invite duplicate email in same org shows 409 inline error (BR-05)

Permissions
  ✅ auth-e2e-22: unauthenticated /settings/users redirects to /login

Empty states
  ✅ auth-e2e-23: team members page always shows at least the admin row

Accept Invite page
  ✅ auth-e2e-24: AC-04/AC-05 — visiting accept-invite without token shows error
  ✅ auth-e2e-25: accept-invite form validation — required fields on submit
  ✅ auth-e2e-26: accept-invite — password mismatch shows inline error
```

---

## 5. Business Rule Coverage

| BR # | Rule | Test IDs |
|------|------|----------|
| BR-01 | Organisation must always have at least one Admin | auth-unit-16, auth-unit-18, auth-int-19, auth-e2e-18 |
| BR-02 | Admin cannot deactivate themselves if last Admin | auth-unit-16, auth-e2e-18 |
| BR-03 | Invite links expire after 72 hours | auth-unit-12, auth-unit-13, auth-e2e-24 |
| BR-04 | Passwords must be at least 8 characters | auth-unit-01, auth-e2e-04 |
| BR-05 | Email unique per organisation | auth-unit-02, auth-unit-10, auth-int-06, auth-e2e-21 |
| BR-06 | Deactivated user cannot log in | auth-unit-06 |
| BR-07 | Password reset tokens expire after 1 hour | auth-unit-23, auth-unit-24, auth-unit-25 |
| BR-08 | organisation_id always from JWT | auth-int-06, auth-int-09, auth-int-12, auth-int-18, auth-int-21 |

---

## 6. Permission Coverage

| Role | Action | Expected | Test ID |
|------|--------|----------|---------|
| Admin | View team members (/settings/users) | ALLOWED | auth-e2e-14 |
| Unauthenticated | View /settings/users | REDIRECT → /login | auth-e2e-22 |
| Admin | Invite user | ALLOWED | auth-e2e-15 |
| Admin | Invite duplicate email | 409 inline error | auth-e2e-21 |
| Admin | Change user role | ALLOWED | auth-e2e-17 |
| Admin | Deactivate non-last-admin user | ALLOWED | auth-e2e-19 |
| Admin | Deactivate last admin | DENIED (button disabled) | auth-e2e-18 |
| Admin | Resend invite to pending | ALLOWED | auth-e2e-20 |
| Any | Multi-tenancy: user from org A invisible to org B | DENIED | auth-int-06, auth-int-09, auth-int-12, auth-int-18, auth-int-21 |

---

## 7. Test Environment

| Requirement | Value |
|-------------|-------|
| Database | Neon test DB (real queries, no mocks) |
| Auth tokens | `createTestToken(user)` from `backend/src/test/helpers.ts` |
| Reset between tests | local `cleanup(orgId)` — soft-deletes users and org only |
| Unit test mocks | `vi.mock('../repository')`, `vi.mock('bcryptjs')` |
| E2E base URL | `PLAYWRIGHT_BASE_URL` env var (default: `http://localhost:5173`) |
