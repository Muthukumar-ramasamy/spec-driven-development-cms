export interface Lead {
  id: string
  organizationId: string
  ownerId: string
  title: string
  value: number | null
  status: 'new' | 'contacted' | 'qualified' | 'disqualified' | 'converted'
  source: string | null
  contactId: string | null
  companyId: string | null
  convertedAt: string | null
  convertedDealId: string | null
  ownerName: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedLeads {
  data: Lead[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface LeadFilters {
  page?: number
  limit?: number
  search?: string
  status?: string
  ownerId?: string
}
