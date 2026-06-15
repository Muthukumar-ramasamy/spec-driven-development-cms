import { z } from 'zod'

// Empty strings from unregistered RHF fields must be coerced to undefined
// before uuid() validation runs, otherwise the backend rejects them.
const optionalUuid = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.string().uuid().optional(),
)

// Mirrors openapi.yaml #/components/schemas/CreateNoteRequest
export const createNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  isPinned: z.boolean().optional().default(false),
  dealId: optionalUuid,
  contactId: optionalUuid,
  companyId: optionalUuid,
  leadId: optionalUuid,
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
