import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate'
import * as controller from './controller'

export async function contactManagementRoutes(app: FastifyInstance) {
  app.get('/contacts', { preHandler: [authenticate], handler: controller.listContacts })
  app.post('/contacts', { preHandler: [authenticate], handler: controller.createContact })
  app.get('/contacts/:id', { preHandler: [authenticate], handler: controller.getContactById })
  app.put('/contacts/:id', { preHandler: [authenticate], handler: controller.updateContact })
  app.delete('/contacts/:id', { preHandler: [authenticate], handler: controller.deleteContact })
}
