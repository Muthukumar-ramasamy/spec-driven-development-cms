export type ContactSource = 'manual' | 'import' | 'web_form' | 'api' | 'lead_conversion'

export interface Contact {
  id: string
  organizationId: string
  ownerId: string
  companyId: string | null
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  jobTitle: string | null
  linkedinUrl: string | null
  source: ContactSource | null
  ownerName: string
  companyName: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ContactDetail extends Contact {
  deals: unknown[]
  activities: unknown[]
  notes: unknown[]
}

export interface PaginatedContacts {
  data: Contact[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
