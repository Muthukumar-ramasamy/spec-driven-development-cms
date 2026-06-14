import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  decimal,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'
import { contacts } from './contacts'
import { companies } from './companies'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const leadStatusEnum = pgEnum('lead_status', [
  'new',
  'contacted',
  'qualified',
  'disqualified',
  'converted',
])

export const leadSourceEnum = pgEnum('lead_source', [
  'website',
  'referral',
  'cold_call',
  'email',
  'social',
  'event',
  'other',
])

// ─── Table ────────────────────────────────────────────────────────────────────

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    value: decimal('value', { precision: 12, scale: 2 }).default('0'),
    status: leadStatusEnum('status').notNull().default('new'),
    source: leadSourceEnum('source'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    convertedAt: timestamp('converted_at', { withTimezone: true }),
    // converted_deal_id has no FK here — deals table is created in deal-pipeline-management.
    // The FK (REFERENCES deals(id) ON DELETE SET NULL) is added via ALTER TABLE migration
    // once the deals table exists.
    convertedDealId: uuid('converted_deal_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    orgIdx: index('leads_org_idx').on(table.organizationId),
    ownerIdx: index('leads_owner_idx').on(table.ownerId),
    statusIdx: index('leads_status_idx').on(table.status),
    deletedAtIdx: index('leads_deleted_at_idx').on(table.deletedAt),
  }),
)

export type Lead = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert
