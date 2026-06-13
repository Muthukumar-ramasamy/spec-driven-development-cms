# Feature Spec: Auth & User Management

---

## 1. Overview

| Field | Value |
|-------|-------|
| Feature name | Auth & User Management |
| Module | Module 1 |
| Priority | P0 |
| Status | Draft |
| Author | Product Agent |
| Created | 2026-06-13 |
| Last updated | 2026-06-13 |

---

## 2. Business Goal

Allow team members to sign up, log in, and be assigned the right role. The Admin must be able to invite and manage the team. Every record in the system must be tied to the user who created it and the organisation it belongs to. Without this module, no other module can function — authentication is the gateway to all CRM data.

---

## 3. User Roles Affected

- [x] Admin
- [x] Manager
- [x] Sales Rep

---

## 4. User Stories

### 4.1 Workspace sign-up
**As an** Admin,
**I want to** create a workspace for my organisation,
**So that** my team has a private, isolated CRM instance.

### 4.2 Invite team member
**As an** Admin,
**I want to** invite a team member by email with a specified role,
**So that** they can access the CRM with the correct permissions.

### 4.3 Accept invite and set password
**As an** invited user,
**I want to** accept my invite and set my password,
**So that** I can log in with my own credentials.

### 4.4 Log in
**As any** user,
**I want to** log in with my email and password,
**So that** I can access my workspace securely.

### 4.5 Log out
**As any** user,
**I want to** log out,
**So that** my session is closed on shared or public devices.

### 4.6 Reset forgotten password
**As any** user,
**I want to** reset my password via email,
**So that** I can regain access if I forget my credentials.

### 4.7 Deactivate team member
**As an** Admin,
**I want to** deactivate a user,
**So that** a former team member can no longer access the CRM.

### 4.8 Change user role
**As an** Admin,
**I want to** change a user's role,
**So that** their permissions match their current responsibilities.

### 4.9 Reactivate team member
**As an** Admin,
**I want to** reactivate a deactivated user,
**So that** a returning team member can regain access without a new invite.

---

## 5. Acceptance Criteria

### AC-01: Workspace creation
**Given** a valid email, password, organisation name, and user name,
**When** a new user submits the sign-up form,
**Then** an organisation record is created, the user is created with role Admin, a JWT is returned, and the user is redirected to the pipeline board.

### AC-02: Duplicate workspace email
**Given** a user with the email `sam@co.com` already exists in an organisation,
**When** another sign-up is attempted with the same email,
**Then** the system returns 409 with message "A user with this email already exists."

### AC-03: Invite sent
**Given** an Admin submits a valid email and role in the invite form,
**When** the invite is sent,
**Then** a user record is created with status Pending, a 72-hour invite token is stored, and the invited user receives an invite email.

### AC-04: Invite accepted
**Given** a user clicks a valid (non-expired) invite link and sets a password,
**When** they submit the accept-invite form,
**Then** their account status changes to Active, the invite token is cleared, and a JWT is returned.

### AC-05: Expired invite rejected
**Given** an invite link that is older than 72 hours,
**When** a user attempts to use it,
**Then** the system returns 422 with message "This invite link has expired. Ask your admin to resend it."

### AC-06: Login with valid credentials
**Given** an Active user with verified email and password,
**When** they submit correct credentials,
**Then** a JWT access token is returned, stored in localStorage, and the user is redirected to the pipeline board.

### AC-07: Login with invalid credentials
**Given** a user submits an incorrect password,
**When** the login form is submitted,
**Then** the system returns 401 with message "Invalid email or password."

### AC-08: Deactivated user blocked
**Given** an Admin has deactivated a user,
**When** the deactivated user attempts to log in,
**Then** the system returns 403 with message "Your account has been deactivated. Contact your admin."

### AC-09: Deactivate blocked — last admin
**Given** a user is the last Admin in an organisation,
**When** an Admin attempts to deactivate them,
**Then** the system returns 422 with message "Cannot deactivate the last admin. Assign another admin first."

### AC-10: Password reset flow
**Given** a user requests a password reset with their email,
**When** they follow the reset link (valid for 1 hour) and submit a new password,
**Then** their password is updated and all prior sessions are invalidated.

### AC-11: Role change
**Given** an Admin changes a user's role from Sales Rep to Manager,
**When** confirmed,
**Then** the user's role is updated and their JWT on next login reflects the new role.

### AC-12: Resend invite
**Given** a Pending user has not accepted their invite,
**When** an Admin clicks "Resend invite",
**Then** a new 72-hour invite token replaces the old one and a new invite email is sent.

---

## 6. Out of Scope (MVP)

- SSO / OAuth (Google, Microsoft)
- Two-factor authentication (2FA)
- Session management UI (view / revoke active sessions)
- Audit log of user actions
- Password strength meter
- Email change flow (post-MVP)

---

## 7. Data Requirements

### Entities involved
- **Organization**: created on sign-up; all other entities scoped to it
- **User**: created on sign-up (Admin) or invite acceptance; holds role, status, invite token

### New fields (if any)

| Entity | Field | Type | Required | Notes |
|--------|-------|------|----------|-------|
| Organization | name | VARCHAR(255) | Yes | Workspace display name |
| Organization | slug | VARCHAR(100) | Yes | Unique, URL-safe identifier |
| User | role | ENUM | Yes | admin, manager, sales_rep |
| User | status | ENUM | Yes | active, pending, deactivated |
| User | password_hash | VARCHAR(255) | Yes | bcrypt hash |
| User | invite_token | VARCHAR(255) | No | 72h expiry; cleared on accept |
| User | invite_token_expires_at | TIMESTAMPTZ | No | Set on invite; null after accept |
| User | password_reset_token | VARCHAR(255) | No | 1h expiry |
| User | password_reset_expires_at | TIMESTAMPTZ | No | |
| User | deactivated_at | TIMESTAMPTZ | No | Set when deactivated |

---

## 8. API Requirements

| Method | Path | Description | Auth required |
|--------|------|-------------|---------------|
| POST | /api/auth/signup | Create organisation + admin user | No |
| POST | /api/auth/login | Authenticate, return JWT | No |
| POST | /api/auth/logout | Invalidate session (client-side JWT clear) | Yes |
| POST | /api/auth/forgot-password | Send reset email | No |
| POST | /api/auth/reset-password | Set new password via token | No |
| POST | /api/auth/accept-invite | Accept invite, set password | No |
| GET | /api/users | List users in org | Yes |
| POST | /api/users/invite | Invite new team member | Yes — Admin |
| POST | /api/users/:id/resend-invite | Resend invite to pending user | Yes — Admin |
| PUT | /api/users/:id | Update role or status | Yes — Admin |
| DELETE | /api/users/:id | Deactivate user (soft) | Yes — Admin |

---

## 9. UI Requirements

| Page / Component | Description |
|-----------------|-------------|
| Login page | Email + password form; link to forgot-password |
| Signup page | Org name, user name, email, password |
| Forgot-password page | Email input; sends reset link |
| Reset-password page | New password + confirm; uses token from URL |
| Accept-invite page | Name + password; uses token from URL |
| Team members page (`/settings/users`) | Table of users, invite modal, role change, deactivate |
| Invite modal | Email, name, role select |
| Deactivate confirmation dialog | Confirms before deactivation; last-admin guard |

---

## 10. Business Rules

- **BR-01**: Every organisation must have at least one Admin at all times. Deactivating the last admin is blocked.
- **BR-02**: An Admin cannot deactivate themselves if they are the last Admin in the organisation.
- **BR-03**: Invite links expire after 72 hours. Accepting an expired invite returns 422.
- **BR-04**: Passwords must be at least 8 characters.
- **BR-05**: Email must be unique per organisation (not globally).
- **BR-06**: A deactivated user cannot log in. Any existing JWT for a deactivated user is rejected at the auth middleware.
- **BR-07**: Password reset tokens expire after 1 hour.
- **BR-08**: organisation_id is always derived from the JWT, never from the request body.

---

## 11. Error Cases

| Scenario | Expected behaviour |
|----------|-------------------|
| Signup with duplicate email | 409 "A user with this email already exists." |
| Login with wrong password | 401 "Invalid email or password." |
| Login as deactivated user | 403 "Your account has been deactivated." |
| Use expired invite link | 422 "This invite link has expired." |
| Deactivate last admin | 422 "Cannot deactivate the last admin." |
| Use expired password reset token | 422 "This reset link has expired." |
| Invite already-existing email | 409 "A user with this email already exists in your team." |

---

## 12. Permissions Matrix

| Action | Admin | Manager | Sales Rep |
|--------|-------|---------|-----------|
| Sign up (create org) | ✅ | ✅ | ✅ |
| Log in | ✅ | ✅ | ✅ |
| Log out | ✅ | ✅ | ✅ |
| Reset own password | ✅ | ✅ | ✅ |
| View team members | ✅ | ❌ | ❌ |
| Invite team member | ✅ | ❌ | ❌ |
| Change user role | ✅ | ❌ | ❌ |
| Deactivate user | ✅ | ❌ | ❌ |
| Reactivate user | ✅ | ❌ | ❌ |
| Resend invite | ✅ | ❌ | ❌ |

---

## 13. Related Specs

| Spec | Path |
|------|------|
| UI spec (auth pages) | `specs/ui/auth.md` |
| UI spec (team members) | `specs/ui/team-members.md` |
| API spec | `specs/api/openapi.yaml#/paths/~1api~1auth` |
| DB spec | `specs/features/auth-user-management/db-spec.md` |
| Test spec | `specs/features/auth-user-management/test-spec.md` |

---

## 14. Open Questions

| # | Question | Owner | Due | Status |
|---|----------|-------|-----|--------|
| 1 | Should JWT refresh tokens be implemented in MVP or rely solely on 24h access tokens? | Product | — | Resolved: 24h access token only (ADR-003) |
| 2 | Should password reset invalidate existing JWTs or only prevent new logins? | Product | — | Resolved: invalidate all existing JWTs on reset |
