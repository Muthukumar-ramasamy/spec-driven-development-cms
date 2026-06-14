import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate'
import * as controller from './controller'

/**
 * Notes module routes.
 *
 * All routes require a valid JWT (authenticate preHandler).
 * Fine-grained ownership checks (author vs. admin) are enforced in service.ts,
 * not at the route level, because the rule is record-level, not role-level.
 *
 * Route prefix is registered externally (e.g. /api) so paths here are relative.
 */
export async function notesRoutes(app: FastifyInstance) {
  // GET  /api/notes          — list notes (filter required; see service BR-05)
  app.get('/notes', { preHandler: [authenticate], handler: controller.listNotes })

  // POST /api/notes          — create a note
  app.post('/notes', { preHandler: [authenticate], handler: controller.createNote })

  // GET  /api/notes/:id      — get a single note
  app.get('/notes/:id', { preHandler: [authenticate], handler: controller.getNoteById })

  // PUT  /api/notes/:id      — update content / isPinned (author or admin)
  app.put('/notes/:id', { preHandler: [authenticate], handler: controller.updateNote })

  // DELETE /api/notes/:id    — soft-delete (author or admin)
  app.delete('/notes/:id', { preHandler: [authenticate], handler: controller.deleteNote })
}
