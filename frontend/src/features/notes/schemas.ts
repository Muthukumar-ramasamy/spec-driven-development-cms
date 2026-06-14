import { z } from 'zod'

// Mirrors openapi.yaml #/components/schemas/CreateNoteRequest
export const createNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  isPinned: z.boolean().optional().default(false),
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>

// Mirrors openapi.yaml #/components/schemas/UpdateNoteRequest
export const updateNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').optional(),
  isPinned: z.boolean().optional(),
})

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>

// Inline edit form — only the content field is edited by the user directly
export const editNoteContentSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
})

export type EditNoteContentInput = z.infer<typeof editNoteContentSchema>
