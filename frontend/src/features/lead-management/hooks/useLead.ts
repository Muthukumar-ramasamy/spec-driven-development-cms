import { useQuery } from '@tanstack/react-query'
import { getLead } from '../api'

export function useLead(id: string | null) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: () => getLead(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}
