CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  industry VARCHAR(100),
  employee_count INTEGER,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Partial unique index: company name unique per org (only for non-deleted records)
CREATE UNIQUE INDEX companies_name_org_unique_idx
  ON companies (organization_id, name)
  WHERE deleted_at IS NULL;

CREATE INDEX companies_org_idx ON companies (organization_id);
CREATE INDEX companies_owner_idx ON companies (owner_id);
CREATE INDEX companies_deleted_at_idx ON companies (deleted_at);

-- Add FK from contacts to companies (SET NULL on delete — handled in application via BR-02)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS company_id_fk UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Note: contacts.company_id already exists as a plain UUID column (no FK constraint).
-- BR-02 (SET NULL on company soft-delete) is enforced at the application service layer
-- rather than via a DB-level ON DELETE SET NULL trigger, because the company is soft-deleted
-- (deleted_at = NOW()) rather than hard-deleted. The service calls unlinkCompanyContacts()
-- after soft-deleting the company record.
