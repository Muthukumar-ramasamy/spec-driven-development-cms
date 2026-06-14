-- Migration: create_pipeline_stages
-- Creates pipeline_stages with a CHECK constraint on probability (0–100).

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id      UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  display_order    INTEGER NOT NULL,
  probability      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  CONSTRAINT pipeline_stages_probability_check CHECK (probability >= 0 AND probability <= 100)
);

CREATE INDEX IF NOT EXISTS pipeline_stages_pipeline_idx  ON pipeline_stages (pipeline_id);
CREATE INDEX IF NOT EXISTS pipeline_stages_org_idx       ON pipeline_stages (organization_id);
CREATE INDEX IF NOT EXISTS pipeline_stages_deleted_at_idx ON pipeline_stages (deleted_at);
