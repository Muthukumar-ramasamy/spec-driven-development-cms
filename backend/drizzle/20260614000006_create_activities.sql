-- Migration: create_activities
-- Creates the activity_type enum and activities table.
-- Includes DB-level CHECK constraint enforcing at least one linked record.

-- ─── Enum ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('call', 'email', 'meeting', 'demo', 'lunch', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── activities ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type             activity_type NOT NULL,
  subject          VARCHAR(255) NOT NULL,
  notes            TEXT,
  done             BOOLEAN NOT NULL DEFAULT FALSE,
  done_at          TIMESTAMPTZ,
  due_date         DATE,
  owner_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  deal_id          UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id       UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id       UUID REFERENCES companies(id) ON DELETE SET NULL,
  lead_id          UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  -- BR-01: At least one linked record must be present (also enforced in service layer)
  CONSTRAINT activities_linked_record_check CHECK (
    deal_id IS NOT NULL
    OR contact_id IS NOT NULL
    OR company_id IS NOT NULL
    OR lead_id IS NOT NULL
  )
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS activities_org_idx        ON activities (organization_id);
CREATE INDEX IF NOT EXISTS activities_owner_idx      ON activities (owner_id);
CREATE INDEX IF NOT EXISTS activities_done_idx       ON activities (done);
CREATE INDEX IF NOT EXISTS activities_deal_idx       ON activities (deal_id);
CREATE INDEX IF NOT EXISTS activities_contact_idx    ON activities (contact_id);
CREATE INDEX IF NOT EXISTS activities_company_idx    ON activities (company_id);
CREATE INDEX IF NOT EXISTS activities_lead_idx       ON activities (lead_id);
CREATE INDEX IF NOT EXISTS activities_deleted_at_idx ON activities (deleted_at);
