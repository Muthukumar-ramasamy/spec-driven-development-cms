import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import * as controller from './controller'

export async function authUserManagementRoutes(app: FastifyInstance) {
  // ── Public auth endpoints ────────────────────────────────────────────────────
  app.post('/auth/signup', { handler: controller.signup })
  app.post('/auth/login', { handler: controller.login })
  app.post('/auth/logout', { preHandler: [authenticate], handler: controller.logout })
  app.post('/auth/forgot-password', { handler: controller.forgotPassword })
  app.post('/auth/reset-password', { handler: controller.resetPassword })
  app.post('/auth/accept-invite', { handler: controller.acceptInvite })

  // ── Protected user management endpoints (Admin only) ──────────────────────
  app.get('/users', {
    preHandler: [authenticate, authorize('admin')],
    handler: controller.listUsers,
  })

  app.post('/users/invite', {
    preHandler: [authenticate, authorize('admin')],
    handler: controller.inviteUser,
  })

  app.post('/users/:id/resend-invite', {
    preHandler: [authenticate, authorize('admin')],
    handler: controller.resendInvite,
  })

  app.put('/users/:id', {
    preHandler: [authenticate, authorize('admin')],
    handler: controller.updateUser,
  })

  app.delete('/users/:id', {
    preHandler: [authenticate, authorize('admin')],
    handler: controller.deactivateUser,
  })
}
