import { useQuery } from '@tanstack/react-query'
import { getPipelineValueReport } from '../api'
import type { ReportsFilters } from '../types'

export function usePipelineValueReport(filters: ReportsFilters = {}) {
  return useQuery({
    queryKey: ['reports', 'pipeline-value', filters],
    queryFn: () => getPipelineValueReport(filters),
    staleTime: 30_000,
  })
}
