// Core Note entity — mirrors the API response shape (openapi.yaml #/components/schemas/Note)
export interface Note {
  id: string
  organizationId: string
  content: string
  authorId: string
  authorName: string // eagerly joined from users table by backend
  isPinned: boolean
  dealId: string | null
  contactId: string | null
  companyId: string | null
  leadId: string | null
  createdAt: string
  updatedAt: string
}

// Paginated list response — envelope matches { data: Note[], pagination: {...} }
export interface PaginatedNotes {
  data: Note[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Filter params for GET /api/notes
export interface ListNotesFilters {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  dealId?: string
  contactId?: string
  companyId?: string
  leadId?: string
}

// Which parent record type a NotesFeed is embedded in
export type NoteRecordType = 'deal' | 'contact' | 'company' | 'lead'
