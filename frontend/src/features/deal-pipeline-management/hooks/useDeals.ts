import { useQuery } from '@tanstack/react-query'
import { listDeals } from '../api'
import type { ListDealsFilters } from '../types'

export function useDeals(filters: ListDealsFilters) {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: () => listDeals(filters),
    staleTime: 30_000,
  })
}
