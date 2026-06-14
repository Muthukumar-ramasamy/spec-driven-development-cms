import { FastifyRequest, FastifyReply } from 'fastify'
import { getJwtPayload } from '../../lib/auth'
import * as service from './service'
import {
  createLeadSchema,
  updateLeadSchema,
  convertLeadSchema,
  listLeadsQuerySchema,
} from './schemas'

// ─── listLeads ────────────────────────────────────────────────────────────────

export async function listLeads(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const query = listLeadsQuerySchema.parse(req.query)
  const result = await service.listLeads(caller, query)
  return reply.send(result)
}

// ─── createLead ───────────────────────────────────────────────────────────────

export async function createLead(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const body = createLeadSchema.parse(req.body)
  const lead = await service.createLead(caller, body)
  return reply.status(201).send({ data: lead })
}

// ─── getLeadById ─────────────────────────────────────────────────────────────

export async function getLeadById(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const lead = await service.getLeadById(caller, req.params.id)
  return reply.send({ data: lead })
}

// ─── updateLead ───────────────────────────────────────────────────────────────

export async function updateLead(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const body = updateLeadSchema.parse(req.body)
  const lead = await service.updateLead(caller, req.params.id, body)
  return reply.send({ data: lead })
}

// ─── deleteLead ───────────────────────────────────────────────────────────────

export async function deleteLead(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  await service.deleteLead(caller, req.params.id)
  return reply.status(204).send()
}

// ─── convertLead ─────────────────────────────────────────────────────────────

export async function convertLead(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const body = convertLeadSchema.parse(req.body)
  const result = await service.convertLead(caller, req.params.id, body)
  return reply.status(200).send({ data: result })
}
