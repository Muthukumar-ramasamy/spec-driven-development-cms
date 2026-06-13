import { pgTable, uuid, varchar, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const contactSourceEnum = pgEnum('contact_source', [
  'manual',
  'import',
  'web_form',
  'api',
  'lead_conversion',
])

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id),
    ownerId: uuid('owner_id').notNull().references(() => users.id),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    companyId: uuid('company_id'),
    firstName: varchar('first_name', { length: 255 }).notNull(),
    lastName: varchar('last_name', { length: 255 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    jobTitle: varchar('job_title', { length: 255 }),
    linkedinUrl: varchar('linkedin_url', { length: 500 }),
    source: contactSourceEnum('source'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    orgIdx: index('contacts_org_idx').on(table.organizationId),
    ownerIdx: index('contacts_owner_idx').on(table.ownerId),
    companyIdx: index('contacts_company_idx').on(table.companyId),
    emailOrgIdx: index('contacts_email_org_idx').on(table.organizationId, table.email),
    deletedAtIdx: index('contacts_deleted_at_idx').on(table.deletedAt),
  }),
)

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
