import { useQuery } from '@tanstack/react-query'
import * as contactApi from '../api'

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: () => contactApi.getContact(id),
    staleTime: 30_000,
    enabled: !!id,
  })
}
