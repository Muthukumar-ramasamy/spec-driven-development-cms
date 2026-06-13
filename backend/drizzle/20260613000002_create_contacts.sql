CREATE TYPE contact_source AS ENUM ('manual', 'import', 'web_form', 'api', 'lead_conversion');

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  company_id UUID,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  job_title VARCHAR(255),
  linkedin_url VARCHAR(500),
  source contact_source,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Partial unique index: email unique per org (only for non-deleted, non-null emails)
CREATE UNIQUE INDEX contacts_email_org_unique_idx
  ON contacts (organization_id, email)
  WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE INDEX contacts_org_idx ON contacts (organization_id);
CREATE INDEX contacts_owner_idx ON contacts (owner_id);
CREATE INDEX contacts_company_idx ON contacts (company_id);
CREATE INDEX contacts_deleted_at_idx ON contacts (deleted_at);
