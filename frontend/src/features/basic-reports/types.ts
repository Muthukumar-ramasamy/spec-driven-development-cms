// Shared query parameters for all report endpoints
export interface ReportsFilters {
  startDate?: string // YYYY-MM-DD
  endDate?: string   // YYYY-MM-DD
  ownerId?: string
}

// GET /api/reports/deals
export interface DealsReport {
  won: { count: number; totalValue: number }
  lost: { count: number; totalValue: number }
  dateRange: { startDate: string; endDate: string }
}

// GET /api/reports/pipeline-value
export interface PipelineValueReport {
  stages: Array<{
    stageId: string
    stageName: string
    dealCount: number
    totalValue: number
  }>
  grandTotal: number
}

// GET /api/reports/activities
export interface ActivitiesReport {
  reps: Array<{
    userId: string
    name: string
    call: number
    email: number
    meeting: number
    demo: number
    lunch: number
    other: number
    total: number
  }>
  dateRange: { startDate: string; endDate: string }
}

// GET /api/reports/leads-by-source
export interface LeadsBySourceReport {
  sources: Array<{ source: string; count: number }>
  dateRange: { startDate: string; endDate: string }
}
