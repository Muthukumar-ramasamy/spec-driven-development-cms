import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  orgName: z.string().min(1, 'Company name is required').max(255),
  firstName: z.string().min(1, 'Your name is required').max(255),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
export type SignupFormValues = z.infer<typeof signupSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
})
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export const acceptInviteSchema = z
  .object({
    name: z.string().min(1, 'Your name is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
export type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>

export const inviteMemberSchema = z.object({
  email: z.string().email('Enter a valid email'),
  firstName: z.string().max(255).optional(),
  role: z.enum(['admin', 'manager', 'sales_rep']),
})
export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>
