import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate'
import * as controller from './controller'

export async function activityTaskTrackingRoutes(app: FastifyInstance) {
  // List activities / tasks
  app.get('/activities', { preHandler: [authenticate], handler: controller.listActivities })

  // Create a new activity or task
  app.post('/activities', { preHandler: [authenticate], handler: controller.createActivity })

  // Get a single activity by ID
  app.get('/activities/:id', { preHandler: [authenticate], handler: controller.getActivityById })

  // Mark an activity as done — MUST be registered BEFORE PUT /activities/:id
  // so that Fastify matches '/activities/:id/done' before '/:id' swallows 'done'
  app.put('/activities/:id/done', { preHandler: [authenticate], handler: controller.markActivityDone })

  // Update an activity (type, subject, notes, dueDate only)
  app.put('/activities/:id', { preHandler: [authenticate], handler: controller.updateActivity })

  // Soft-delete an activity
  app.delete('/activities/:id', { preHandler: [authenticate], handler: controller.deleteActivity })
}
