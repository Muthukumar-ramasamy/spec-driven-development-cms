import { z } from 'zod'

// ─── Create ──────────────────────────────────────────────────────────────────

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  website: z.string().max(255).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  employeeCount: z.number().int().min(0).optional().nullable(),
  ownerId: z.string().uuid().optional(),
  notes: z.string().optional().nullable(),
})

export type CreateCompanyInput = z.infer<typeof createCompanySchema>

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  website: z.string().max(255).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  employeeCount: z.number().int().min(0).optional().nullable(),
  ownerId: z.string().uuid().optional(),
  notes: z.string().optional().nullable(),
})

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>

// ─── List query ──────────────────────────────────────────────────────────────

export const listCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['created_at', 'name']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
})

export type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>
