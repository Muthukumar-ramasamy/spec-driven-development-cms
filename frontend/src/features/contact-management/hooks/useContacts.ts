import { useQuery } from '@tanstack/react-query'
import * as contactApi from '../api'
import type { ContactsFilters } from '../api'

export function useContacts(filters: ContactsFilters = {}) {
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: () => contactApi.listContacts(filters),
    staleTime: 30_000,
  })
}
