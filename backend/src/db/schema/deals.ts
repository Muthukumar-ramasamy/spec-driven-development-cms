import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  decimal,
  date,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'
import { contacts } from './contacts'
import { companies } from './companies'
import { pipelineStages } from './pipeline-stages'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const dealStatusEnum = pgEnum('deal_status', ['open', 'won', 'lost'])

// ─── Table ────────────────────────────────────────────────────────────────────
// NOTE: lost_reason must be NOT NULL when status = 'lost'.
// This invariant is enforced at the service layer (Zod + service guard).
// A DB-level CHECK constraint is added in the migration SQL.
//
// NOTE: lead_id is stored as a plain UUID column (no FK declared here).
// The FK (REFERENCES leads(id) ON DELETE SET NULL) is added via ALTER TABLE
// in migration 20260614000002_create_pipelines.sql once the leads table exists.

export const deals = pgTable(
  'deals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    value: decimal('value', { precision: 12, scale: 2 }).default('0'),
    status: dealStatusEnum('status').notNull().default('open'),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => pipelineStages.id, { onDelete: 'restrict' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    // lead_id: plain UUID — no FK in Drizzle schema (deals table created before the leads→deals FK)
    leadId: uuid('lead_id'),
    expectedCloseDate: date('expected_close_date'),
    wonAt: timestamp('won_at', { withTimezone: true }),
    lostAt: timestamp('lost_at', { withTimezone: true }),
    lostReason: text('lost_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    orgIdx: index('deals_org_idx').on(table.organizationId),
    ownerIdx: index('deals_owner_idx').on(table.ownerId),
    stageIdx: index('deals_stage_idx').on(table.stageId),
    statusIdx: index('deals_status_idx').on(table.status),
    deletedAtIdx: index('deals_deleted_at_idx').on(table.deletedAt),
  }),
)

export type Deal = typeof deals.$inferSelect
export type NewDeal = typeof deals.$inferInsert
