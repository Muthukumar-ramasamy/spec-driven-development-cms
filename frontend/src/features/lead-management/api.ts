import { api } from '../../lib/api'
import type { Lead, PaginatedLeads, LeadFilters } from './types'

export function listLeads(filters: LeadFilters): Promise<PaginatedLeads> {
  return api.get('/leads', { params: filters }).then((r) => r.data)
}

export function getLead(id: string): Promise<{ data: Lead }> {
  return api.get(`/leads/${id}`).then((r) => r.data)
}

export function createLead(
  data: Record<string, unknown>,
): Promise<{ data: Lead }> {
  return api.post('/leads', data).then((r) => r.data)
}

export function updateLead(
  id: string,
  data: Record<string, unknown>,
): Promise<{ data: Lead }> {
  return api.put(`/leads/${id}`, data).then((r) => r.data)
}

export function deleteLead(id: string): Promise<void> {
  return api.delete(`/leads/${id}`).then((r) => r.data)
}

export function convertLead(
  id: string,
  stageId: string,
): Promise<{ data: { deal: { id: string } } }> {
  return api.post(`/leads/${id}/convert`, { stageId }).then((r) => r.data)
}
