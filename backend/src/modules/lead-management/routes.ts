import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate'
import * as controller from './controller'

export async function leadManagementRoutes(app: FastifyInstance) {
  app.get('/leads', { preHandler: [authenticate], handler: controller.listLeads })
  app.post('/leads', { preHandler: [authenticate], handler: controller.createLead })
  app.get('/leads/:id', { preHandler: [authenticate], handler: controller.getLeadById })
  app.put('/leads/:id', { preHandler: [authenticate], handler: controller.updateLead })
  app.delete('/leads/:id', { preHandler: [authenticate], handler: controller.deleteLead })
  app.post('/leads/:id/convert', { preHandler: [authenticate], handler: controller.convertLead })
}
