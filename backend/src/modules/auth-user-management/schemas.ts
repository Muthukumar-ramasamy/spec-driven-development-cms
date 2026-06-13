import { z } from 'zod'

export const signupSchema = z.object({
  orgName: z.string().min(1).max(255),
  firstName: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
export type SignupInput = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>

export const inviteUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(255).optional(),
  role: z.enum(['admin', 'manager', 'sales_rep']),
})
export type InviteUserInput = z.infer<typeof inviteUserSchema>

export const updateUserSchema = z.object({
  role: z.enum(['admin', 'manager', 'sales_rep']).optional(),
  status: z.enum(['active', 'deactivated']).optional(),
})
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['admin', 'manager', 'sales_rep']).optional(),
  status: z.enum(['active', 'pending', 'deactivated']).optional(),
  sort: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
