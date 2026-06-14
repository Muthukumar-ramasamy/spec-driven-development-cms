import { useQuery } from '@tanstack/react-query'
import { getLeadsBySourceReport } from '../api'
import type { ReportsFilters } from '../types'

export function useLeadsBySourceReport(filters: ReportsFilters = {}) {
  return useQuery({
    queryKey: ['reports', 'leads-by-source', filters],
    queryFn: () => getLeadsBySourceReport(filters),
    staleTime: 30_000,
  })
}
