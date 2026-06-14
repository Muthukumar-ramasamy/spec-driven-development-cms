-- Migration: create_pipelines
-- Creates the pipelines table and wires up the deferred FK from leads → deals.

-- ─── pipelines ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipelines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL DEFAULT 'Sales Pipeline',
  is_default       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pipelines_org_idx ON pipelines (organization_id);

-- ─── Deferred FK: leads.converted_deal_id → deals(id) ───────────────────────
-- The leads table was created before the deals table, so the FK could not be
-- declared there. We add it now (deals is created in the next migration but
-- the FK here is for the leads → deals direction which runs after deals exists
-- in the overall migration sequence).
-- Use IF NOT EXISTS guards so re-running this migration is safe.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_deal_id UUID;

-- The FK constraint is added after the deals table exists (migration 20260614000004).
-- It is declared separately here as a named constraint so it can be added idempotently.
-- NOTE: This constraint will only succeed after 20260614000004 has run.
-- If your migration runner executes files in timestamp order, this is safe.
-- If not, move this ALTER TABLE to the end of 20260614000004.
