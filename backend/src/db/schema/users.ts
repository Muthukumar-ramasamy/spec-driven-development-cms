import { pgTable, uuid, varchar, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'sales_rep'])
export const userStatusEnum = pgEnum('user_status', ['active', 'pending', 'deactivated'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('sales_rep'),
  status: userStatusEnum('status').notNull().default('pending'),
  inviteToken: varchar('invite_token', { length: 255 }),
  inviteTokenExpiresAt: timestamp('invite_token_expires_at', { withTimezone: true }),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpiresAt: timestamp('password_reset_expires_at', { withTimezone: true }),
  deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  orgIdx: index('users_org_idx').on(table.organizationId),
  emailOrgIdx: index('users_email_org_idx').on(table.organizationId, table.email),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
