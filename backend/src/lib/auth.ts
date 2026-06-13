import { FastifyRequest } from 'fastify'

export interface JWTPayload {
  sub: string
  organizationId: string
  role: 'admin' | 'manager' | 'sales_rep'
  iat: number
  exp: number
}

export function getJwtPayload(request: FastifyRequest): JWTPayload {
  return request.user as JWTPayload
}
