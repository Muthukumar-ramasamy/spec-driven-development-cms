import { z } from 'zod'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const activityTypeValues = [
  'call',
  'email',
  'meeting',
  'demo',
  'lunch',
  'other',
] as const

// ─── Create ──────────────────────────────────────────────────────────────────

export const createActivitySchema = z.object({
  type: z.enum(activityTypeValues, {
    errorMap: () => ({
      message: 'Invalid activity type. Must be one of: call, email, meeting, demo, lunch, other.',
    }),
  }),
  subject: z.string().min(1, 'Subject is required').max(255),
  notes: z.string().optional(),
  done: z.boolean().optional().default(false),
  // ISO datetime string — if done=true and not provided, service sets it to now()
  doneAt: z.string().optional(),
  // Date-only string in YYYY-MM-DD format
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be in YYYY-MM-DD format')
    .optional(),
  // ownerId may only be supplied by admin/manager — enforced in service
  ownerId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
})

export type CreateActivityInput = z.infer<typeof createActivitySchema>

// ─── Update ──────────────────────────────────────────────────────────────────
// done and doneAt are NOT updatable via PUT — use the /done endpoint instead.

export const updateActivitySchema = z.object({
  type: z
    .enum(activityTypeValues, {
      errorMap: () => ({
        message: 'Invalid activity type. Must be one of: call, email, meeting, demo, lunch, other.',
      }),
    })
    .optional(),
  subject: z.string().min(1).max(255).optional(),
  notes: z.string().optional().nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
})

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>

// ─── Mark Done ───────────────────────────────────────────────────────────────

export const markDoneSchema = z.object({
  notes: z.string().optional(),
})

export type MarkDoneInput = z.infer<typeof markDoneSchema>

// ─── List query ──────────────────────────────────────────────────────────────
// done is received as a string ('true'/'false') from the query string;
// coercion to boolean is handled in the service layer.

export const listActivitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  sort: z
    .enum(['created_at', 'due_date', 'subject'])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  // done filter arrives as a string; coerced to boolean in service
  done: z.enum(['true', 'false']).optional(),
  ownerId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
})

export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>
