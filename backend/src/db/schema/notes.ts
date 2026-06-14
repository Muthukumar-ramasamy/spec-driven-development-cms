import { pgTable, uuid, text, boolean, timestamp, index, sql } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'
import { contacts } from './contacts'
import { companies } from './companies'
import { leads } from './leads'
import { deals } from './deals'

// NOTE: The DB-level CHECK constraint (at least one linked record must be non-null)
// is declared in the migration SQL, not here, because Drizzle ORM does not expose
// a first-class API for arbitrary CHECK constraints on the table level in all versions.
// The service layer enforces the same rule (BR-02 / BR-05) before the DB is reached.

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    content: text('content').notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),
    // Optional FKs — all SET NULL on parent delete
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'set null' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    orgIdx: index('notes_org_idx').on(table.organizationId),
    authorIdx: index('notes_author_idx').on(table.authorId),
    dealIdx: index('notes_deal_idx').on(table.dealId),
    contactIdx: index('notes_contact_idx').on(table.contactId),
    companyIdx: index('notes_company_idx').on(table.companyId),
    leadIdx: index('notes_lead_idx').on(table.leadId),
    deletedAtIdx: index('notes_deleted_at_idx').on(table.deletedAt),
    isPinnedIdx: index('notes_is_pinned_idx').on(table.isPinned),
  }),
)

export type Note = typeof notes.$inferSelect
export type NewNote = typeof notes.$inferInsert
