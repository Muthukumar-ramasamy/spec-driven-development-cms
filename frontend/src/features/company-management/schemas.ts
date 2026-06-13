import { z } from 'zod'

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  website: z.string().max(255).optional().or(z.literal('')),
  industry: z.string().max(100).optional().or(z.literal('')),
  employeeCount: z.coerce
    .number({ invalid_type_error: 'Employee count must be a number' })
    .int('Employee count must be a whole number')
    .min(0, 'Employee count cannot be negative')
    .optional()
    .nullable(),
  notes: z.string().optional().or(z.literal('')),
  ownerId: z.string().uuid().optional(),
})
export type CreateCompanyFormValues = z.infer<typeof createCompanySchema>

export const updateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255).optional(),
  website: z.string().max(255).optional().nullable().or(z.literal('')),
  industry: z.string().max(100).optional().nullable().or(z.literal('')),
  employeeCount: z.coerce
    .number({ invalid_type_error: 'Employee count must be a number' })
    .int('Employee count must be a whole number')
    .min(0, 'Employee count cannot be negative')
    .optional()
    .nullable(),
  notes: z.string().optional().nullable().or(z.literal('')),
  ownerId: z.string().uuid().optional(),
})
export type UpdateCompanyFormValues = z.infer<typeof updateCompanySchema>
