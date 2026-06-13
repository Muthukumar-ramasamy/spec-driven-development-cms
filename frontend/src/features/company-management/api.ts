import { api } from '../../lib/api'
import type { Company, CompanyDetail, PaginatedCompanies } from './types'
import type { CreateCompanyFormValues, UpdateCompanyFormValues } from './schemas'

export interface CompaniesFilters {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
}

export function listCompanies(filters: CompaniesFilters = {}): Promise<PaginatedCompanies> {
  return api.get('/companies', { params: filters }).then((r) => r.data)
}

export function getCompany(id: string): Promise<{ data: CompanyDetail }> {
  return api.get(`/companies/${id}`).then((r) => r.data)
}

export function createCompany(data: CreateCompanyFormValues): Promise<{ data: Company }> {
  return api.post('/companies', data).then((r) => r.data)
}

export function updateCompany(
  id: string,
  data: UpdateCompanyFormValues,
): Promise<{ data: Company }> {
  return api.put(`/companies/${id}`, data).then((r) => r.data)
}

export function deleteCompany(id: string): Promise<void> {
  return api.delete(`/companies/${id}`).then((r) => r.data)
}
