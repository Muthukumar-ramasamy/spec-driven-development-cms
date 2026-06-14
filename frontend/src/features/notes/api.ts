import { api } from '../../lib/api'
import type { Note, PaginatedNotes, ListNotesFilters } from './types'
import type { CreateNoteInput, UpdateNoteInput } from './schemas'

// GET /api/notes — returns paginated { data: Note[], pagination: {...} }
export function listNotes(filters: ListNotesFilters = {}): Promise<PaginatedNotes> {
  return api.get('/api/notes', { params: filters }).then((r) => r.data)
}

// GET /api/notes/:id — returns { data: Note }
export function getNote(id: string): Promise<Note> {
  return api.get(`/api/notes/${id}`).then((r) => r.data.data)
}

// POST /api/notes — returns { data: Note }
export function createNote(data: CreateNoteInput): Promise<Note> {
  return api.post('/api/notes', data).then((r) => r.data.data)
}

// PUT /api/notes/:id — returns { data: Note }
export function updateNote(id: string, data: UpdateNoteInput): Promise<Note> {
  return api.put(`/api/notes/${id}`, data).then((r) => r.data.data)
}

// DELETE /api/notes/:id — returns 204 No Content
export function deleteNote(id: string): Promise<void> {
  return api.delete(`/api/notes/${id}`).then(() => undefined)
}
