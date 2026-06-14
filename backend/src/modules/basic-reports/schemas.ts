import { z } from 'zod'

// ─── ISO date regex: YYYY-MM-DD ───────────────────────────────────────────────
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

// ─── Common query params schema ───────────────────────────────────────────────
// Used by: deals, activities, leads-by-source
// (pipeline-value omits startDate/endDate — shows current open pipeline)

export const reportQuerySchema = z.object({
  startDate: z
    .string()
    .regex(isoDateRegex, 'Invalid date format. Use ISO8601 (YYYY-MM-DD).')
    .optional(),
  endDate: z
    .string()
    .regex(isoDateRegex, 'Invalid date format. Use ISO8601 (YYYY-MM-DD).')
    .optional(),
  ownerId: z.string().uuid('ownerId must be a valid UUID.').optional(),
})

// Pipeline-value has its own query schema (no date range, but ownerId still
// allowed so Managers can narrow to one rep's open deals)
export const pipelineValueQuerySchema = z.object({
  ownerId: z.string().uuid('ownerId must be a valid UUID.').optional(),
})

// ─── TypeScript types ─────────────────────────────────────────────────────────

export type ReportQuery = z.infer<typeof reportQuerySchema>
export type PipelineValueQuery = z.infer<typeof pipelineValueQuerySchema>

// ─── Response payload types (for service → controller contract) ───────────────

export interface DealsReportData {
  won: { count: number; totalValue: number }
  lost: { count: number; totalValue: number }
  dateRange: { startDate: string; endDate: string }
}

export interface PipelineStageRow {
  stageId: string
  stageName: string
  dealCount: number
  totalValue: number
}

export interface PipelineValueData {
  stages: PipelineStageRow[]
  grandTotal: number
}

export interface RepActivityRow {
  userId: string
  name: string
  call: number
  email: number
  meeting: number
  demo: number
  lunch: number
  other: number
  total: number
}

export interface ActivitiesReportData {
  reps: RepActivityRow[]
  dateRange: { startDate: string; endDate: string }
}

export interface SourceRow {
  source: string
  count: number
}

export interface LeadsBySourceData {
  sources: SourceRow[]
  dateRange: { startDate: string; endDate: string }
}
