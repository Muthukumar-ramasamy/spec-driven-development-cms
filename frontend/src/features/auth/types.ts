export type UserRole = 'admin' | 'manager' | 'sales_rep'
export type UserStatus = 'active' | 'pending' | 'deactivated'

export interface User {
  id: string
  organizationId: string
  firstName: string
  lastName: string | null
  email: string
  role: UserRole
  status: UserStatus
  deactivatedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthUser {
  id: string
  organizationId: string
  firstName: string
  role: UserRole
  status: UserStatus
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export interface ListUsersResponse {
  data: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiError {
  error: string
  message: string
  details?: Array<{ field: string; message: string }>
}
