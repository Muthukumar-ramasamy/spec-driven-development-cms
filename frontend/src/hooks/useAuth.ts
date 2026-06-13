import { useMemo } from 'react'
import { getToken } from '../lib/auth'

export interface AuthUser {
  sub: string
  organizationId: string
  role: 'admin' | 'manager' | 'sales_rep'
}

export function useAuth(): AuthUser | null {
  const token = getToken()
  return useMemo(() => {
    if (!token) return null
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return {
        sub: payload.sub,
        organizationId: payload.organizationId,
        role: payload.role,
      }
    } catch {
      return null
    }
  }, [token])
}
