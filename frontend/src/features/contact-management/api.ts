import { api } from '../../lib/api'
import type { Contact, ContactDetail, PaginatedContacts } from './types'
import type { CreateContactFormValues, UpdateContactFormValues } from './schemas'

export interface ContactsFilters {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
  ownerId?: string
  companyId?: string
}

export function listContacts(filters: ContactsFilters = {}): Promise<PaginatedContacts> {
  return api.get('/contacts', { params: filters }).then((r) => r.data)
}

export function getContact(id: string): Promise<{ data: ContactDetail }> {
  return api.get(`/contacts/${id}`).then((r) => r.data)
}

export function createContact(data: CreateContactFormValues): Promise<{ data: Contact }> {
  return api.post('/contacts', data).then((r) => r.data)
}

export function updateContact(
  id: string,
  data: UpdateContactFormValues,
): Promise<{ data: Contact }> {
  return api.put(`/contacts/${id}`, data).then((r) => r.data)
}

export function deleteContact(id: string): Promise<void> {
  return api.delete(`/contacts/${id}`).then((r) => r.data)
}
