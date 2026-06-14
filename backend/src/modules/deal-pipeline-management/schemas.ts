import { z } from 'zod'

// ─── Deal schemas ─────────────────────────────────────────────────────────────

export const createDealSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  // BR-01: stageId is required — a deal must have a pipeline stage on creation
  stageId: z.string().uuid('Pipeline stage is required'),
  // BR-06: value defaults to 0 if not provided (also defaulted in DB schema)
  value: z.number().nonnegative().optional(),
  // ownerId may only be supplied by admin/manager; enforced in service
  ownerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  expectedCloseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected format: YYYY-MM-DD').optional(),
})

export type CreateDealInput = z.infer<typeof createDealSchema>

export const updateDealSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  stageId: z.string().uuid().optional(),
  value: z.number().nonnegative().optional().nullable(),
  // ownerId may only be supplied by admin/manager; enforced in service
  ownerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  expectedCloseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

export type UpdateDealInput = z.infer<typeof updateDealSchema>

// BR-02: lostReason is required when marking a deal lost — enforced here
export const markLostSchema = z.object({
  lostReason: z.string().min(1, 'Lost reason is required'),
})

export type MarkLostInput = z.infer<typeof markLostSchema>

export const listDealsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  sort: z
    .enum(['created_at', 'title', 'value', 'expected_close_date'])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  // Default is 'open' — applied in service for BR-03/AC-04
  status: z.string().optional().default('open'),
  // Filter by owner (admin/manager only; sales_rep always forced to own — BR-03)
  ownerId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
})

export type ListDealsQuery = z.infer<typeof listDealsQuerySchema>

// ─── Pipeline Stage schemas ───────────────────────────────────────────────────

export const createStageSchema = z.object({
  name: z.string().min(1, 'Stage name is required').max(100),
  displayOrder: z.number().int().min(0, 'Display order must be a non-negative integer'),
  probability: z.number().int().min(0).max(100).optional().default(0),
})

export type CreateStageInput = z.infer<typeof createStageSchema>

export const updateStageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  probability: z.number().int().min(0).max(100).optional(),
})

export type UpdateStageInput = z.infer<typeof updateStageSchema>

export const reorderStagesSchema = z.object({
  stages: z
    .array(
      z.object({
        id: z.string().uuid(),
        displayOrder: z.number().int().min(0),
      }),
    )
    .min(1, 'At least one stage must be provided'),
})

export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>
