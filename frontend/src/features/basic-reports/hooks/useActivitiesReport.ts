import { useQuery } from '@tanstack/react-query'
import { getActivitiesReport } from '../api'
import type { ReportsFilters } from '../types'

export function useActivitiesReport(filters: ReportsFilters = {}) {
  return useQuery({
    queryKey: ['reports', 'activities', filters],
    queryFn: () => getActivitiesReport(filters),
    staleTime: 30_000,
  })
}
