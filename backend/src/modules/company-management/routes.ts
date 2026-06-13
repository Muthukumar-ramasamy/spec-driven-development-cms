import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate'
import * as controller from './controller'

export async function companyManagementRoutes(app: FastifyInstance) {
  app.get('/companies', { preHandler: [authenticate], handler: controller.listCompanies })
  app.post('/companies', { preHandler: [authenticate], handler: controller.createCompany })
  app.get('/companies/:id', { preHandler: [authenticate], handler: controller.getCompanyById })
  app.put('/companies/:id', { preHandler: [authenticate], handler: controller.updateCompany })
  app.delete('/companies/:id', { preHandler: [authenticate], handler: controller.deleteCompany })
}
