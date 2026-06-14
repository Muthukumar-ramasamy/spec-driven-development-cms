import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core'
import { deals } from './deals'
import { pipelineStages } from './pipeline-stages'
import { users } from './users'

// ─── Table ────────────────────────────────────────────────────────────────────
// This table is APPEND-ONLY. There is no deletedAt column — records are never
// soft-deleted or hard-deleted. Stage history is an immutable audit trail (BR-07).
//
// organizationId is stored as a plain UUID (no FK) purely for efficient scoping.
// from_stage_id is a plain UUID (nullable — null on initial deal placement).
// to_stage_id has FK to pipeline_stages (RESTRICT) to prevent orphaned history.

export const dealStageHistory = pgTable(
  'deal_stage_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id')
      .notNull()
      .references(() => deals.id, { onDelete: 'cascade' }),
    // organizationId stored for scoped queries; no FK to avoid circular deps
    organizationId: uuid('organization_id').notNull(),
    // null on initial placement (deal creation)
    fromStageId: uuid('from_stage_id'),
    toStageId: uuid('to_stage_id')
      .notNull()
      .references(() => pipelineStages.id, { onDelete: 'restrict' }),
    movedBy: uuid('moved_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    movedAt: timestamp('moved_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    dealIdx: index('deal_stage_history_deal_idx').on(table.dealId),
    orgIdx: index('deal_stage_history_org_idx').on(table.organizationId),
  }),
)

export type DealStageHistory = typeof dealStageHistory.$inferSelect
export type NewDealStageHistory = typeof dealStageHistory.$inferInsert
