import { FastifyRequest, FastifyReply } from 'fastify'
import { ForbiddenError } from '../lib/errors'
import { JWTPayload } from '../lib/auth'

type Role = 'admin' | 'manager' | 'sales_rep'

export function authorize(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = request.user as JWTPayload
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError()
    }
  }
}
