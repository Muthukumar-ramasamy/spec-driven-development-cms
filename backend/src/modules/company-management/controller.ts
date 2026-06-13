import { FastifyRequest, FastifyReply } from 'fastify'
import { getJwtPayload } from '../../lib/auth'
import * as service from './service'
import {
  createCompanySchema,
  updateCompanySchema,
  listCompaniesQuerySchema,
} from './schemas'

// ─── listCompanies ────────────────────────────────────────────────────────────

export async function listCompanies(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const query = listCompaniesQuerySchema.parse(req.query)
  const result = await service.listCompanies(caller, query)
  return reply.send(result)
}

// ─── createCompany ────────────────────────────────────────────────────────────

export async function createCompany(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const body = createCompanySchema.parse(req.body)
  const company = await service.createCompany(caller, body)
  return reply.status(201).send({ data: company })
}

// ─── getCompanyById ───────────────────────────────────────────────────────────

export async function getCompanyById(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const company = await service.getCompanyById(caller, req.params.id)
  return reply.send({ data: company })
}

// ─── updateCompany ────────────────────────────────────────────────────────────

export async function updateCompany(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const body = updateCompanySchema.parse(req.body)
  const company = await service.updateCompany(caller, req.params.id, body)
  return reply.send({ data: company })
}

// ─── deleteCompany ────────────────────────────────────────────────────────────

export async function deleteCompany(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  await service.deleteCompany(caller, req.params.id)
  return reply.status(204).send()
}
