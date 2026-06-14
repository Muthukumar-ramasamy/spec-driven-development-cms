// Activity type enum values
export type ActivityType = 'call' | 'email' | 'meeting' | 'demo' | 'lunch' | 'other'

// Core Activity entity — mirrors the API response shape
export interface Activity {
  id: string
  organizationId: string
  type: ActivityType
  subject: string
  notes: string | null
  done: boolean
  doneAt: string | null
  dueDate: string | null
  ownerId: string
  ownerName: string
  dealId: string | null
  contactId: string | null
  companyId: string | null
  leadId: string | null
  createdAt: string
  updatedAt: string
}

// Paginated list response — envelope matches { data: Activity[], pagination: {...} }
export interface PaginatedActivities {
  data: Activity[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Filter params for listing activities
export interface ListActivitiesFilters {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
  done?: boolean
  ownerId?: string
  dealId?: string
  contactId?: string
  companyId?: string
  leadId?: string
}

// Linked record descriptor used by ActivityForm and ActivityFeed
export type LinkedRecordType = 'deal' | 'contact' | 'company' | 'lead'

export interface LinkedRecord {
  type: LinkedRecordType
  id: string
  label: string
}
