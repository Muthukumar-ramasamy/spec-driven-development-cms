import { useQuery } from '@tanstack/react-query'
import { listLeads } from '../api'
import type { LeadFilters } from '../types'

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => listLeads(filters),
    staleTime: 30_000,
  })
}
