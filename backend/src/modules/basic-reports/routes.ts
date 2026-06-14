import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate'
import * as controller from './controller'

/**
 * Basic Reports routes — all GET, read-only.
 *
 * All routes require a valid JWT (authenticate preHandler).
 * RBAC is enforced at the service layer, not here:
 *   - sales_rep: ownerId silently overridden to caller.sub (BR-02)
 *   - manager/admin: see all-org data or filter by ownerId
 *
 * Registered under the /api/reports prefix (set in app.ts).
 */
export async function basicReportsRoutes(app: FastifyInstance) {
  // GET /api/reports/deals
  // Deals won/lost summary for a date range (default: last 30 days)
  app.get('/deals', {
    preHandler: [authenticate],
    handler: controller.getDealsReport,
  })

  // GET /api/reports/pipeline-value
  // Open deal value grouped by pipeline stage (current snapshot, no date range)
  app.get('/pipeline-value', {
    preHandler: [authenticate],
    handler: controller.getPipelineValueReport,
  })

  // GET /api/reports/activities
  // Activity count per rep broken down by type, for a date range
  app.get('/activities', {
    preHandler: [authenticate],
    handler: controller.getActivitiesReport,
  })

  // GET /api/reports/leads-by-source
  // Lead count grouped by source enum for a date range
  app.get('/leads-by-source', {
    preHandler: [authenticate],
    handler: controller.getLeadsBySourceReport,
  })
}
