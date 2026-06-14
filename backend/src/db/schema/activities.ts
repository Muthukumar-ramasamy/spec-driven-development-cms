import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'
import { contacts } from './contacts'
import { companies } from './companies'
import { leads } from './leads'
import { deals } from './deals'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const activityTypeEnum = pgEnum('activity_type', [
  'call',
  'email',
  'meeting',
  'demo',
  'lunch',
  'other',
])

// ─── Table ────────────────────────────────────────────────────────────────────
// NOTE: The DB-level CHECK constraint (at least one linked record must be NOT NULL)
// is enforced in the migration SQL. Drizzle does not support arbitrary CHECK
// constraints via the schema DSL, so it is applied via raw SQL in the migration.

export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    type: activityTypeEnum('type').notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    notes: text('notes'),
    done: boolean('done').notNull().default(false),
    doneAt: timestamp('done_at', { withTimezone: true }),
    dueDate: date('due_date'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'set null' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    orgIdx: index('activities_org_idx').on(table.organizationId),
    ownerIdx: index('activities_owner_idx').on(table.ownerId),
    doneIdx: index('activities_done_idx').on(table.done),
    dealIdx: index('activities_deal_idx').on(table.dealId),
    contactIdx: index('activities_contact_idx').on(table.contactId),
    companyIdx: index('activities_company_idx').on(table.companyId),
    leadIdx: index('activities_lead_idx').on(table.leadId),
    deletedAtIdx: index('activities_deleted_at_idx').on(table.deletedAt),
  }),
)

export type Activity = typeof activities.$inferSelect
export type NewActivity = typeof activities.$inferInsert
