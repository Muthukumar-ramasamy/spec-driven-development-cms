import { z } from 'zod'

export const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().max(255).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  jobTitle: z.string().max(255).optional(),
  companyId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
})
export type CreateContactFormValues = z.infer<typeof createContactSchema>

export const updateContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255).optional(),
  lastName: z.string().max(255).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  jobTitle: z.string().max(255).optional(),
  companyId: z.string().uuid().optional().nullable(),
})
export type UpdateContactFormValues = z.infer<typeof updateContactSchema>
