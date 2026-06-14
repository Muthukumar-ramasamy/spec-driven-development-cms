import { z } from 'zod'

export const createLeadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  value: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().nonnegative('Value must be a positive number').optional(),
  ),
  source: z.string().optional(),
  contactId: z
    .string()
    .uuid('Contact ID must be a valid UUID')
    .optional()
    .or(z.literal('')),
  companyId: z
    .string()
    .uuid('Company ID must be a valid UUID')
    .optional()
    .or(z.literal('')),
})

export type CreateLeadFormValues = z.infer<typeof createLeadSchema>

export const updateLeadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  value: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().nonnegative('Value must be a positive number').optional(),
  ),
  status: z
    .enum(['new', 'contacted', 'qualified', 'disqualified'])
    .optional(),
  source: z.string().optional(),
  contactId: z
    .string()
    .uuid('Contact ID must be a valid UUID')
    .optional()
    .or(z.literal('')),
  companyId: z
    .string()
    .uuid('Company ID must be a valid UUID')
    .optional()
    .or(z.literal('')),
})

export type UpdateLeadFormValues = z.infer<typeof updateLeadSchema>
