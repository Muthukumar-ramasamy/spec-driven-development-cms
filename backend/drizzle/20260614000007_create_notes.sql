-- Migration: create notes table
-- Feature: Notes (Module 7)
-- Timestamp: 20260614000007

CREATE TABLE IF NOT EXISTS "notes" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "author_id"       UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "content"         TEXT NOT NULL,
  "is_pinned"       BOOLEAN NOT NULL DEFAULT FALSE,
  "deal_id"         UUID REFERENCES "deals"("id") ON DELETE SET NULL,
  "contact_id"      UUID REFERENCES "contacts"("id") ON DELETE SET NULL,
  "company_id"      UUID REFERENCES "companies"("id") ON DELETE SET NULL,
  "lead_id"         UUID REFERENCES "leads"("id") ON DELETE SET NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"      TIMESTAMPTZ,

  -- Business rule BR-03 / AC-02: at least one linked record must be present
  CONSTRAINT "notes_linked_record_check"
    CHECK (
      "deal_id"    IS NOT NULL
      OR "contact_id" IS NOT NULL
      OR "company_id" IS NOT NULL
      OR "lead_id"    IS NOT NULL
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS "notes_org_idx"        ON "notes" ("organization_id");
CREATE INDEX IF NOT EXISTS "notes_author_idx"     ON "notes" ("author_id");
CREATE INDEX IF NOT EXISTS "notes_deal_idx"       ON "notes" ("deal_id");
CREATE INDEX IF NOT EXISTS "notes_contact_idx"    ON "notes" ("contact_id");
CREATE INDEX IF NOT EXISTS "notes_company_idx"    ON "notes" ("company_id");
CREATE INDEX IF NOT EXISTS "notes_lead_idx"       ON "notes" ("lead_id");
CREATE INDEX IF NOT EXISTS "notes_deleted_at_idx" ON "notes" ("deleted_at");
CREATE INDEX IF NOT EXISTS "notes_is_pinned_idx"  ON "notes" ("is_pinned");

-- Composite index for the default sort (is_pinned DESC, created_at DESC) per org
CREATE INDEX IF NOT EXISTS "notes_org_pin_created_idx"
  ON "notes" ("organization_id", "is_pinned" DESC, "created_at" DESC)
  WHERE "deleted_at" IS NULL;
