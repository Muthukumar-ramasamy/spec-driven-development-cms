// Types for Deal & Pipeline Management module

export interface PipelineStage {
  id: string
  pipelineId: string
  organizationId: string
  name: string
  displayOrder: number
  probability: number
  createdAt: string
  updatedAt: string
  deletedAt: null
}

export interface Deal {
  id: string
  organizationId: string
  title: string
  value: number | null
  status: 'open' | 'won' | 'lost'
  stageId: string
  ownerId: string
  ownerName: string
  contactId: string | null
  companyId: string | null
  leadId: string | null
  expectedCloseDate: string | null
  wonAt: string | null
  lostAt: string | null
  lostReason: string | null
  createdAt: string
  updatedAt: string
}

export interface DealStageHistory {
  id: string
  dealId: string
  organizationId: string
  fromStageId: string | null
  toStageId: string
  movedBy: string
  movedAt: string
}

export interface DealDetail extends Deal {
  stageHistory: DealStageHistory[]
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedDeals {
  data: Deal[]
  pagination: Pagination
}

export interface ListDealsFilters {
  page?: number
  limit?: number
  status?: 'open' | 'won' | 'lost'
  stageId?: string
  ownerId?: string
}
