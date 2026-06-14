import { FastifyRequest, FastifyReply } from 'fastify'
import { getJwtPayload } from '../../lib/auth'
import * as service from './service'
import { reportQuerySchema, pipelineValueQuerySchema } from './schemas'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/deals
// ─────────────────────────────────────────────────────────────────────────────

export async function getDealsReport(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const query = reportQuerySchema.parse(req.query)
  const data = await service.getDealsReport(caller, query)
  return reply.send({ data })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/pipeline-value
// ─────────────────────────────────────────────────────────────────────────────

export async function getPipelineValueReport(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const query = pipelineValueQuerySchema.parse(req.query)
  const data = await service.getPipelineValueReport(caller, query)
  return reply.send({ data })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/activities
// ─────────────────────────────────────────────────────────────────────────────

export async function getActivitiesReport(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const query = reportQuerySchema.parse(req.query)
  const data = await service.getActivitiesReport(caller, query)
  return reply.send({ data })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/leads-by-source
// ─────────────────────────────────────────────────────────────────────────────

export async function getLeadsBySourceReport(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const query = reportQuerySchema.parse(req.query)
  const data = await service.getLeadsBySourceReport(caller, query)
  return reply.send({ data })
}
