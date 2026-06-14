import { useQuery } from '@tanstack/react-query'
import * as notesApi from '../api'
import type { ListNotesFilters } from '../types'

// Stable query key includes all filter params so cache is invalidated
// when the parent record or pagination changes.
export function useNotes(filters: ListNotesFilters) {
  return useQuery({
    queryKey: ['notes', filters],
    queryFn: () => notesApi.listNotes(filters),
    staleTime: 30_000,
    // Do not fetch until we have at least one record ID to filter by.
    // Without a filter the query would return notes across all records.
    enabled:
      Boolean(filters.dealId) ||
      Boolean(filters.contactId) ||
      Boolean(filters.companyId) ||
      Boolean(filters.leadId),
  })
}
