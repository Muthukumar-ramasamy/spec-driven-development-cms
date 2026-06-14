import { z } from 'zod'

// Canonical list of activity types — used both as the Zod enum source and for UI labels
export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'demo', 'lunch', 'other'] as const

// Human-readable labels for each activity type
export const ACTIVITY_TYPE_LABELS: Record<typeof ACTIVITY_TYPES[number], string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  demo: 'Demo',
  lunch: 'Lunch',
  other: 'Other',
}

// ---------------------------------------------------------------------------
// Create activity / task
// ---------------------------------------------------------------------------
export const createActivitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES, { required_error: 'Activity type is required' }),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject must be 255 characters or less'),
  notes: z.string().optional(),
  done: z.boolean().optional().default(false),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  dealId: z.string().uuid('Must be a valid UUID').optional().or(z.literal('')),
  contactId: z.string().uuid('Must be a valid UUID').optional().or(z.literal('')),
  companyId: z.string().uuid('Must be a valid UUID').optional().or(z.literal('')),
  leadId: z.string().uuid('Must be a valid UUID').optional().or(z.literal('')),
})

export type CreateActivityFormValues = z.infer<typeof createActivitySchema>

// ---------------------------------------------------------------------------
// Update activity
// ---------------------------------------------------------------------------
export const updateActivitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES).optional(),
  subject: z.string().min(1, 'Subject is required').max(255).optional(),
  notes: z.string().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
})

export type UpdateActivityFormValues = z.infer<typeof updateActivitySchema>

// ---------------------------------------------------------------------------
// Mark activity as done
// ---------------------------------------------------------------------------
export const markDoneSchema = z.object({
  notes: z.string().optional(),
})

export type MarkDoneFormValues = z.infer<typeof markDoneSchema>
