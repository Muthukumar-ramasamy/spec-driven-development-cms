-- Migration: create_deal_stage_history
-- This table is APPEND-ONLY — no deleted_at column, no soft delete.
-- Records are immutable stage-move audit entries (BR-07).

CREATE TABLE IF NOT EXISTS deal_stage_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id          UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  -- organization_id stored for efficient scoping; no FK (avoids circular dep)
  organization_id  UUID NOT NULL,
  -- from_stage_id is NULL on initial deal placement (first history entry)
  from_stage_id    UUID,
  to_stage_id      UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
  moved_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  moved_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deal_stage_history_deal_idx ON deal_stage_history (deal_id);
CREATE INDEX IF NOT EXISTS deal_stage_history_org_idx  ON deal_stage_history (organization_id);
