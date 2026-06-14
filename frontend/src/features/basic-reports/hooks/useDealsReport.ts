import { useQuery } from '@tanstack/react-query'
import { getDealsReport } from '../api'
import type { ReportsFilters } from '../types'

export function useDealsReport(filters: ReportsFilters = {}) {
  return useQuery({
    queryKey: ['reports', 'deals', filters],
    queryFn: () => getDealsReport(filters),
    staleTime: 30_000,
  })
}
