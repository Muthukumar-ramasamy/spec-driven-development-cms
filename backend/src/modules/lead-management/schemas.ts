import { z } from 'zod'

// ─── Enums ────────────────────────────────────────────────────────────────────

const leadSourceValues = [
  'website',
  'referral',
  'cold_call',
  'email',
  'social',
  'event',
  'other',
] as const

// Status values allowed on update — 'converted' is set only by the /convert endpoint
const leadStatusUpdateValues = [
  'new',
  'contacted',
  'qualified',
  'disqualified',
] as const

// ─── Create ──────────────────────────────────────────────────────────────────

export const createLeadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  value: z.number().nonnegative().optional(),
  source: z.enum(leadSourceValues).optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  // ownerId may only be supplied by admin/manager; enforced in service
  ownerId: z.string().uuid().optional(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>

// ─── Update ──────────────────────────────────────────────────────────────────
// status = 'converted' is intentionally excluded — use the /convert endpoint instead.

export const updateLeadSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  value: z.number().nonnegative().optional().nullable(),
  status: z.enum(leadStatusUpdateValues).optional(),
  source: z.enum(leadSourceValues).optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  // ownerId may only be supplied by admin/manager; enforced in service
  ownerId: z.string().uuid().optional(),
})

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>

// ─── Convert ─────────────────────────────────────────────────────────────────

export const convertLeadSchema = z.object({
  stageId: z.string().uuid('Pipeline stage is required'),
})

export type ConvertLeadInput = z.infer<typeof convertLeadSchema>

// ─── List query ──────────────────────────────────────────────────────────────

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(['created_at', 'title', 'value', 'status'])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  // Comma-separated status filter, e.g. "new,contacted" (default applied in service for BR-04)
  status: z.string().optional(),
  ownerId: z.string().uuid().optional(),
})

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>
