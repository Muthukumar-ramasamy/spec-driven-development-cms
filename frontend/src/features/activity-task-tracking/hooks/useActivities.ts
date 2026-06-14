import { useQuery } from '@tanstack/react-query'
import { listActivities } from '../api'
import type { ListActivitiesFilters } from '../types'

export function useActivities(filters: ListActivitiesFilters) {
  return useQuery({
    queryKey: ['activities', filters],
    queryFn: () => listActivities(filters),
    staleTime: 30_000,
  })
}
