import { useQuery } from '@tanstack/react-query'
import * as companyApi from '../api'
import type { CompaniesFilters } from '../api'

export function useCompanies(filters: CompaniesFilters = {}) {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: () => companyApi.listCompanies(filters),
    staleTime: 30_000,
  })
}
