import { z } from 'zod'

// ─── Request schemas ──────────────────────────────────────────────────────────

/**
 * POST /api/notes
 * author_id is NOT in this schema — it is always set from the JWT in the service layer (BR-01).
 */
export const createNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  isPinned: z.boolean().optional().default(false),
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
})
export type CreateNoteInput = z.infer<typeof createNoteSchema>

/**
 * PUT /api/notes/:id
 * Only content and isPinned are updatable. author_id is immutable (BR-01).
 * Linked record IDs cannot be changed after creation.
 */
export const updateNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').optional(),
  isPinned: z.boolean().optional(),
})
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>

/**
 * GET /api/notes query parameters.
 * At least one filter param (dealId/contactId/companyId/leadId) is enforced in the service (BR-05).
 */
export const listNotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.enum(['created_at', 'is_pinned']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
})
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>
