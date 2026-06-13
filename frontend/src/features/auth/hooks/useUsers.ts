import { useQuery } from '@tanstack/react-query'
import * as authApi from '../api'

export interface UsersFilters {
  page?: number
  limit?: number
  search?: string
  role?: string
  status?: string
  sort?: string
  order?: string
}

export function useUsers(filters: UsersFilters = {}) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => authApi.listUsers(filters),
    staleTime: 30_000,
  })
}
