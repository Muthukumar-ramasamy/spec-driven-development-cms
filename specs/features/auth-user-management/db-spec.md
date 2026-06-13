# DB Spec: Auth & User Management

---

## 1. Entities Overview

| Entity | Table | Purpose |
|--------|-------|---------|
| Organization | `organizations` | Tenant root — owns all other records |
| User | `users` | Team member; authentication identity |

Full field definitions: `specs/database/entities/organization.md`, `specs/database/entities/user.md`

---

## 2. Key Fields

### Organization

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | PK — gen_random_uuid() |
| name | VARCHAR(255) | Yes | Display name |
| slug | VARCHAR(100) | Yes | Globally unique, URL-safe |
| created_at | TIMESTAMPTZ | Yes | |
| updated_at | TIMESTAMPTZ | Yes | |
| deleted_at | TIMESTAMPTZ | No | Soft delete |

### User

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | PK |
| organization_id | UUID | Yes | FK → organizations.id |
| first_name | VARCHAR(255) | Yes | |
| last_name | VARCHAR(255) | No | |
| email | VARCHAR(255) | Yes | Unique per org |
| password_hash | VARCHAR(255) | Yes | bcrypt |
| role | ENUM | Yes | admin, manager, sales_rep |
| status | ENUM | Yes | active, pending, deactivated |
| invite_token | VARCHAR(255) | No | Cleared on accept |
| invite_token_expires_at | TIMESTAMPTZ | No | 72h from invite |
| password_reset_token | VARCHAR(255) | No | 1h expiry |
| password_reset_expires_at | TIMESTAMPTZ | No | |
| deactivated_at | TIMESTAMPTZ | No | |
| created_at | TIMESTAMPTZ | Yes | |
| updated_at | TIMESTAMPTZ | Yes | |
| deleted_at | TIMESTAMPTZ | No | Soft delete |

---

## 3. Relationships

| From | To | Type | FK | On delete |
|------|----|----|----|----|
| User | Organization | Many-to-one | organization_id | CASCADE |

---

## 4. Critical Constraints

- Composite UNIQUE: `(organization_id, email)` WHERE `deleted_at IS NULL` — email unique per org
- Partial UNIQUE on `organizations.slug` WHERE `deleted_at IS NULL`
- BR-01 (last admin guard): enforced at service layer — DB cannot enforce this

---

## 5. Business Rules (DB level)

- Soft delete only: `deleted_at = NOW()` — never `DELETE FROM`
- All queries scoped by `organization_id`
- `password_hash`, `invite_token`, `password_reset_token` must never be returned in API responses

---

## 6. Migration Notes

- Migration 1: `create_organizations`
- Migration 2: `create_users` (depends on organizations)
- Seed: 5 default pipeline stages seeded when org is created (separate migration/seed, covered in deal-pipeline-management)

---

## 7. Related Specs

| Spec | Path |
|------|------|
| Organization entity | `specs/database/entities/organization.md` |
| User entity | `specs/database/entities/user.md` |
| Feature spec | `specs/features/auth-user-management/feature-spec.md` |
| API spec | `specs/features/auth-user-management/api-spec.md` |
