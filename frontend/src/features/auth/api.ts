import { api } from '../../lib/api'
import type { AuthResponse, ListUsersResponse, User } from './types'

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signup(data: {
  orgName: string
  firstName: string
  email: string
  password: string
}): Promise<AuthResponse> {
  const res = await api.post<{ data: AuthResponse }>('/api/auth/signup', data)
  return res.data.data
}

export async function login(data: {
  email: string
  password: string
}): Promise<AuthResponse> {
  const res = await api.post<{ data: AuthResponse }>('/api/auth/login', data)
  return res.data.data
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout')
}

export async function forgotPassword(data: { email: string }): Promise<void> {
  await api.post('/api/auth/forgot-password', data)
}

export async function resetPassword(data: {
  token: string
  password: string
}): Promise<void> {
  await api.post('/api/auth/reset-password', data)
}

export async function acceptInvite(data: {
  token: string
  name: string
  password: string
}): Promise<AuthResponse> {
  const res = await api.post<{ data: AuthResponse }>('/api/auth/accept-invite', data)
  return res.data.data
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listUsers(params?: {
  page?: number
  limit?: number
  search?: string
  role?: string
  status?: string
  sort?: string
  order?: string
}): Promise<ListUsersResponse> {
  const res = await api.get<ListUsersResponse>('/api/users', { params })
  return res.data
}

export async function inviteUser(data: {
  email: string
  firstName?: string
  role: string
}): Promise<User> {
  const res = await api.post<{ data: User }>('/api/users/invite', data)
  return res.data.data
}

export async function resendInvite(userId: string): Promise<User> {
  const res = await api.post<{ data: User }>(`/api/users/${userId}/resend-invite`)
  return res.data.data
}

export async function updateUser(
  userId: string,
  data: { role?: string; status?: string },
): Promise<User> {
  const res = await api.put<{ data: User }>(`/api/users/${userId}`, data)
  return res.data.data
}

export async function deactivateUser(userId: string): Promise<void> {
  await api.delete(`/api/users/${userId}`)
}
