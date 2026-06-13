import { z } from 'zod'

export const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().max(255).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  jobTitle: z.string().max(255).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  companyId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  source: z.enum(['manual', 'import', 'web_form', 'api', 'lead_conversion']).optional(),
})
export type CreateContactInput = z.infer<typeof createContactSchema>

export const updateContactSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().max(255).optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().max(50).optional().nullable(),
  jobTitle: z.string().max(255).optional().nullable(),
  linkedinUrl: z.string().url().optional().or(z.literal('')).nullable(),
  companyId: z.string().uuid().optional().nullable(),
  ownerId: z.string().uuid().optional(),
})
export type UpdateContactInput = z.infer<typeof updateContactSchema>

export const listContactsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
})
export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>
