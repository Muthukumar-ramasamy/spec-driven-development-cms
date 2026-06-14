import { api } from '../../lib/api'
import type {
  ReportsFilters,
  DealsReport,
  PipelineValueReport,
  ActivitiesReport,
  LeadsBySourceReport,
} from './types'

export function getDealsReport(filters: ReportsFilters = {}): Promise<DealsReport> {
  return api.get('/reports/deals', { params: filters }).then((r) => r.data.data)
}

export function getPipelineValueReport(
  filters: ReportsFilters = {},
): Promise<PipelineValueReport> {
  return api.get('/reports/pipeline-value', { params: filters }).then((r) => r.data.data)
}

export function getActivitiesReport(
  filters: ReportsFilters = {},
): Promise<ActivitiesReport> {
  return api.get('/reports/activities', { params: filters }).then((r) => r.data.data)
}

export function getLeadsBySourceReport(
  filters: ReportsFilters = {},
): Promise<LeadsBySourceReport> {
  return api.get('/reports/leads-by-source', { params: filters }).then((r) => r.data.data)
}
