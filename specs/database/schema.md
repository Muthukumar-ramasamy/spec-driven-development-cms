# Database Schema

This file is the Architect Agent's reference for all existing entities.
Update this file every time a new entity is added or an existing one is changed.

---

## Entities

| Entity | Table | Module | Status |
|--------|-------|--------|--------|
| Organization | organizations | Auth | 🔲 Pending |
| User | users | Auth | 🔲 Pending |
| Contact | contacts | Contacts | 🔲 Pending |
| Company | companies | Companies | 🔲 Pending |
| Lead | leads | Leads | 🔲 Pending |
| Deal | deals | Pipeline | 🔲 Pending |
| Pipeline Stage | pipeline_stages | Pipeline | 🔲 Pending |
| Activity | activities | Activities | 🔲 Pending |
| Task | tasks | Tasks | 🔲 Pending |

---

## Relationships Overview

```
Organization
  └── Users (many)
  └── Contacts (many)
  └── Companies (many)
  └── Leads (many)
  └── Deals (many)

Contact
  └── Company (belongs to, optional)
  └── Leads (many)
  └── Deals (many, through lead conversion)
  └── Activities (many)

Lead
  └── Contact (belongs to, optional)
  └── Company (belongs to, optional)
  └── Deal (converts to, one-way)

Deal
  └── Pipeline Stage (belongs to)
  └── Contact (belongs to)
  └── Activities (many)
  └── Tasks (many)
```

---

## Conventions (all entities follow these)

| Convention | Rule |
|-----------|------|
| Primary key | UUID, `id` |
| Tenant scope | `organization_id` UUID FK (required on all entities) |
| Timestamps | `created_at`, `updated_at` (TIMESTAMPTZ, auto-managed) |
| Soft delete | `deleted_at` TIMESTAMPTZ (NULL = active, set = deleted) |
| Created by | `created_by` UUID FK → users.id |
| All FKs | UUID type, indexed |

---

## Notes

- Populate this file as each feature spec is approved.
- The Architect Agent reads this before designing new entities to avoid conflicts.
- Never remove or rename a column without creating a migration and flagging the breaking change.
