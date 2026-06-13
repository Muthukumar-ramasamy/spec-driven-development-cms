# Test Spec: Auth & User Management

---

## 1. Coverage Map

| AC # | Criterion | Unit | Integration | E2E |
|------|-----------|------|-------------|-----|
| AC-01 | Workspace creation (signup) | ✅ | ✅ | ✅ |
| AC-02 | Duplicate signup email | ✅ | ✅ | ✅ |
| AC-03 | Invite sent | ✅ | ✅ | ✅ |
| AC-04 | Invite accepted | ✅ | ✅ | ✅ |
| AC-05 | Expired invite rejected | ✅ | ✅ | ✅ |
| AC-06 | Login with valid credentials | ✅ | ✅ | ✅ |
| AC-07 | Login with invalid credentials | ✅ | ✅ | ✅ |
| AC-08 | Deactivated user blocked | ✅ | ✅ | ✅ |
| AC-09 | Deactivate blocked — last admin | ✅ | ✅ | ✅ |
| AC-10 | Password reset flow | ✅ | ✅ | ❌ (email flow, not E2E-testable) |
| AC-11 | Role change | ✅ | ✅ | ✅ |
| AC-12 | Resend invite | ✅ | ✅ | ❌ (email flow) |

---

## 2. Unit Tests

**File**: `backend/src/modules/auth/__tests__/auth.service.test.ts`

```
AuthService
  signup()
    ✅ auth-unit-01: creates org and admin user with valid inputs
    ✅ auth-unit-02: throws ConflictError for duplicate email
    ✅ auth-unit-03: returns JWT on success

  login()
    ✅ auth-unit-04: returns JWT for valid credentials
    ✅ auth-unit-05: throws UnauthorizedError for wrong password
    ✅ auth-unit-06: throws ForbiddenError for deactivated user

  invite()
    ✅ auth-unit-07: creates pending user with invite token
    ✅ auth-unit-08: throws ConflictError for existing email

  acceptInvite()
    ✅ auth-unit-09: activates user and clears token
    ✅ auth-unit-10: throws UnprocessableError for expired token

  deactivateUser()
    ✅ auth-unit-11: sets status to deactivated
    ✅ auth-unit-12: throws UnprocessableError when deactivating last admin

  changeRole()
    ✅ auth-unit-13: updates user role
```

---

## 3. Integration Tests

**File**: `backend/src/modules/auth/__tests__/auth.repository.test.ts`

```
POST /api/auth/signup
  ✅ auth-int-01: returns 201 with JWT for valid inputs
  ✅ auth-int-02: returns 409 for duplicate email

POST /api/auth/login
  ✅ auth-int-03: returns 200 with JWT for valid credentials
  ✅ auth-int-04: returns 401 for wrong password
  ✅ auth-int-05: returns 403 for deactivated user

POST /api/users/invite (Admin only)
  ✅ auth-int-06: returns 201 for valid invite
  ✅ auth-int-07: returns 403 when called by non-admin
  ✅ auth-int-08: returns 409 for duplicate email

DELETE /api/users/:id (deactivate)
  ✅ auth-int-09: returns 200 for valid deactivation
  ✅ auth-int-10: returns 422 when deactivating last admin
  ✅ auth-int-11: returns 403 when called by non-admin
```

---

## 4. E2E Tests (Playwright)

**File**: `e2e/auth.spec.ts`

```
AC-01 / AC-06: Full signup → login flow
  ✅ auth-e2e-01: user can sign up and is redirected to /deals
  ✅ auth-e2e-02: user can log in after signup

AC-07: Login failure
  ✅ auth-e2e-03: shows error for wrong password

AC-08: Deactivated user
  ✅ auth-e2e-04: deactivated user sees error on login

AC-03 / AC-04: Invite flow
  ✅ auth-e2e-05: admin invites user; new user appears as Pending
  ✅ auth-e2e-06: invited user accepts invite and can log in

AC-09: Last admin guard
  ✅ auth-e2e-07: deactivate button disabled for last admin with tooltip

AC-11: Role change
  ✅ auth-e2e-08: admin changes role; new role badge shown
```

---

## 5. Permission Tests

| Role | Action | Expected | Test ID |
|------|--------|----------|---------|
| Admin | Invite user | 201 | auth-int-06 |
| Manager | Invite user | 403 | auth-int-07 |
| Sales Rep | Invite user | 403 | auth-int-07 |
| Admin | Deactivate user | 200 | auth-int-09 |
| Manager | Deactivate user | 403 | auth-int-11 |
| Admin | Change role | 200 | auth-int-12 |
| Non-admin | View /settings/users | redirect to /deals | auth-e2e-09 |

---

## 6. Test Environment

| Requirement | Value |
|-------------|-------|
| Database | Neon test DB |
| Auth tokens | `createTestToken(role)` helper |
| Reset between tests | `afterAll: cleanupOrg(orgId)` |
