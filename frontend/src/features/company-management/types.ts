export interface Company {
  id: string
  organizationId: string
  ownerId: string
  name: string
  website: string | null
  industry: string | null
  employeeCount: number | null
  notes: string | null
  ownerName: string
  createdAt: string
  updatedAt: string
}

export interface CompanyDetail extends Company {
  contacts: unknown[]
  deals: unknown[]
}

export interface PaginatedCompanies {
  data: Company[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
