import { useQuery } from '@tanstack/react-query'
import * as companyApi from '../api'

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => companyApi.getCompany(id),
    staleTime: 30_000,
    enabled: !!id,
  })
}
