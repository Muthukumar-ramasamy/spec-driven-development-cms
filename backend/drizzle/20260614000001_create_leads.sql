-- Migration: create_leads
-- Module: lead-management
-- Date: 2026-06-14
--
-- NOTE: converted_deal_id has no FK constraint here.
-- The FK (REFERENCES deals(id) ON DELETE SET NULL) will be added via a separate
-- ALTER TABLE migration once the deals table is created in deal-pipeline-management.

CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted',
  'qualified',
  'disqualified',
  'converted'
);

CREATE TYPE lead_source AS ENUM (
  'website',
  'referral',
  'cold_call',
  'email',
  'social',
  'event',
  'other'
);

CREATE TABLE leads (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title             VARCHAR(255) NOT NULL,
  value             DECIMAL(12, 2)           DEFAULT 0,
  status            lead_status  NOT NULL     DEFAULT 'new',
  source            lead_source,
  owner_id          UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  contact_id        UUID                     REFERENCES contacts(id) ON DELETE SET NULL,
  company_id        UUID                     REFERENCES companies(id) ON DELETE SET NULL,
  converted_at      TIMESTAMPTZ,
  converted_deal_id UUID,        -- FK added later via ALTER TABLE after deals table is created
  created_at        TIMESTAMPTZ  NOT NULL     DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL     DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX leads_org_idx        ON leads (organization_id);
CREATE INDEX leads_owner_idx      ON leads (owner_id);
CREATE INDEX leads_status_idx     ON leads (status);
CREATE INDEX leads_deleted_at_idx ON leads (deleted_at);
