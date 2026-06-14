import { FastifyRequest, FastifyReply } from 'fastify'
import { getJwtPayload } from '../../lib/auth'
import * as service from './service'
import {
  createDealSchema,
  updateDealSchema,
  markLostSchema,
  listDealsQuerySchema,
  createStageSchema,
  updateStageSchema,
  reorderStagesSchema,
} from './schemas'

// ─────────────────────────────────────────────────────────────────────────────
// DEALS
// ─────────────────────────────────────────────────────────────────────────────

// ─── listDeals ────────────────────────────────────────────────────────────────

export async function listDeals(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const query = listDealsQuerySchema.parse(req.query)
  const result = await service.listDeals(caller, query)
  return reply.send(result)
}

// ─── createDeal ───────────────────────────────────────────────────────────────

export async function createDeal(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const body = createDealSchema.parse(req.body)
  const deal = await service.createDeal(caller, body)
  return reply.status(201).send({ data: deal })
}

// ─── getDealById ─────────────────────────────────────────────────────────────

export async function getDealById(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const result = await service.getDealById(caller, req.params.id)
  return reply.send({ data: result })
}

// ─── updateDeal ───────────────────────────────────────────────────────────────

export async function updateDeal(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const body = updateDealSchema.parse(req.body)
  const deal = await service.updateDeal(caller, req.params.id, body)
  return reply.send({ data: deal })
}

// ─── deleteDeal ───────────────────────────────────────────────────────────────

export async function deleteDeal(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  await service.deleteDeal(caller, req.params.id)
  return reply.status(204).send()
}

// ─── markDealWon ─────────────────────────────────────────────────────────────

export async function markDealWon(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const deal = await service.markDealWon(caller, req.params.id)
  return reply.send({ data: deal })
}

// ─── markDealLost ────────────────────────────────────────────────────────────

export async function markDealLost(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const body = markLostSchema.parse(req.body)
  const deal = await service.markDealLost(caller, req.params.id, body)
  return reply.send({ data: deal })
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE STAGES
// ─────────────────────────────────────────────────────────────────────────────

// ─── listStages ──────────────────────────────────────────────────────────────

export async function listStages(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const stages = await service.listStages(caller)
  return reply.send({ data: stages })
}

// ─── createStage ─────────────────────────────────────────────────────────────

export async function createStage(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const body = createStageSchema.parse(req.body)
  const stage = await service.createStage(caller, body)
  return reply.status(201).send({ data: stage })
}

// ─── updateStage ─────────────────────────────────────────────────────────────

export async function updateStage(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const body = updateStageSchema.parse(req.body)
  const stage = await service.updateStage(caller, req.params.id, body)
  return reply.send({ data: stage })
}

// ─── deleteStage ─────────────────────────────────────────────────────────────

export async function deleteStage(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  await service.deleteStage(caller, req.params.id)
  return reply.status(204).send()
}

// ─── reorderStages ───────────────────────────────────────────────────────────

export async function reorderStages(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const body = reorderStagesSchema.parse(req.body)
  const stages = await service.reorderStages(caller, body)
  return reply.send({ data: stages })
}
