import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate'
import * as controller from './controller'

export async function dealPipelineManagementRoutes(app: FastifyInstance) {
  // ─── Deal routes ─────────────────────────────────────────────────────────

  app.get('/deals', { preHandler: [authenticate], handler: controller.listDeals })
  app.post('/deals', { preHandler: [authenticate], handler: controller.createDeal })
  app.get('/deals/:id', { preHandler: [authenticate], handler: controller.getDealById })
  app.put('/deals/:id', { preHandler: [authenticate], handler: controller.updateDeal })
  app.delete('/deals/:id', { preHandler: [authenticate], handler: controller.deleteDeal })
  app.post('/deals/:id/won', { preHandler: [authenticate], handler: controller.markDealWon })
  app.post('/deals/:id/lost', { preHandler: [authenticate], handler: controller.markDealLost })

  // ─── Pipeline Stage routes ────────────────────────────────────────────────
  // IMPORTANT: PUT /pipeline-stages/reorder MUST be registered BEFORE
  // PUT /pipeline-stages/:id — Fastify matches routes in registration order
  // and 'reorder' would otherwise be treated as an :id parameter value.

  app.get('/pipeline-stages', { preHandler: [authenticate], handler: controller.listStages })
  app.post('/pipeline-stages', { preHandler: [authenticate], handler: controller.createStage })

  // /reorder MUST come before /:id
  app.put('/pipeline-stages/reorder', { preHandler: [authenticate], handler: controller.reorderStages })
  app.put('/pipeline-stages/:id', { preHandler: [authenticate], handler: controller.updateStage })
  app.delete('/pipeline-stages/:id', { preHandler: [authenticate], handler: controller.deleteStage })
}
