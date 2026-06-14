-- Migration: create_deals
-- Creates the deal_status enum and deals table.
-- Also adds the deferred FK from leads.converted_deal_id → deals(id).

-- ─── Enum ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE deal_status AS ENUM ('open', 'won', 'lost');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── deals ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title                VARCHAR(255) NOT NULL,
  value                DECIMAL(12, 2) DEFAULT 0,
  status               deal_status NOT NULL DEFAULT 'open',
  stage_id             UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
  owner_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  contact_id           UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id           UUID REFERENCES companies(id) ON DELETE SET NULL,
  -- lead_id: plain UUID, no FK declared here (leads → deals direction handled separately)
  lead_id              UUID,
  expected_close_date  DATE,
  won_at               TIMESTAMPTZ,
  lost_at              TIMESTAMPTZ,
  lost_reason          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,

  -- lost_reason must be present when status = 'lost' (also enforced in service layer)
  CONSTRAINT deals_lost_reason_check CHECK (
    status != 'lost' OR lost_reason IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS deals_org_idx        ON deals (organization_id);
CREATE INDEX IF NOT EXISTS deals_owner_idx      ON deals (owner_id);
CREATE INDEX IF NOT EXISTS deals_stage_idx      ON deals (stage_id);
CREATE INDEX IF NOT EXISTS deals_status_idx     ON deals (status);
CREATE INDEX IF NOT EXISTS deals_deleted_at_idx ON deals (deleted_at);

-- ─── Deferred FK: leads.converted_deal_id → deals(id) ────────────────────────
-- Now that deals exists we can safely add this FK constraint.
-- The column was added (IF NOT EXISTS) in migration 20260614000002.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_deal_id UUID;

ALTER TABLE leads
  ADD CONSTRAINT IF NOT EXISTS leads_converted_deal_id_deals_id_fk
  FOREIGN KEY (converted_deal_id) REFERENCES deals(id) ON DELETE SET NULL;
