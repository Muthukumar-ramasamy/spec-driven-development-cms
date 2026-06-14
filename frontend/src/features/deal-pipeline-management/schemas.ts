import { z } from 'zod'

export const createDealSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  stageId: z.string().uuid('A valid pipeline stage is required'),
  value: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0).optional(),
  ),
  expectedCloseDate: z.string().optional(),
  contactId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  companyId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
})

export const updateDealSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  stageId: z.string().uuid().optional(),
  value: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0).optional(),
  ),
  expectedCloseDate: z.string().optional(),
  contactId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  companyId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  status: z.enum(['open', 'won', 'lost']).optional(),
})

export const markLostSchema = z.object({
  lostReason: z.string().min(1, 'Lost reason is required'),
})

export type CreateDealFormValues = z.infer<typeof createDealSchema>
export type UpdateDealFormValues = z.infer<typeof updateDealSchema>
export type MarkLostFormValues = z.infer<typeof markLostSchema>
