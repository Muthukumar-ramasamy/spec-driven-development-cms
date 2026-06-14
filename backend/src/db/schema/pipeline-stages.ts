import { pgTable, uuid, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { pipelines } from './pipelines'

// ─── Table ────────────────────────────────────────────────────────────────────

export const pipelineStages = pgTable(
  'pipeline_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pipelineId: uuid('pipeline_id')
      .notNull()
      .references(() => pipelines.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    displayOrder: integer('display_order').notNull(),
    // probability: 0–100; CHECK constraint enforced in migration SQL
    probability: integer('probability').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    pipelineIdx: index('pipeline_stages_pipeline_idx').on(table.pipelineId),
    orgIdx: index('pipeline_stages_org_idx').on(table.organizationId),
    deletedAtIdx: index('pipeline_stages_deleted_at_idx').on(table.deletedAt),
  }),
)

export type PipelineStage = typeof pipelineStages.$inferSelect
export type NewPipelineStage = typeof pipelineStages.$inferInsert
