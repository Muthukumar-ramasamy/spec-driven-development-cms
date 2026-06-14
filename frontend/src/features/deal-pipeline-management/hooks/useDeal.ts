import { useQuery } from '@tanstack/react-query'
import { getDeal } from '../api'

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: ['deals', id],
    queryFn: () => getDeal(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}
