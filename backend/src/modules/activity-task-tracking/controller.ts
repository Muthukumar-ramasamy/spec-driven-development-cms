import { FastifyRequest, FastifyReply } from 'fastify'
import { getJwtPayload } from '../../lib/auth'
import * as service from './service'
import {
  createActivitySchema,
  updateActivitySchema,
  markDoneSchema,
  listActivitiesQuerySchema,
} from './schemas'

// ─── listActivities ───────────────────────────────────────────────────────────

export async function listActivities(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const query = listActivitiesQuerySchema.parse(req.query)
  const result = await service.listActivities(caller, query)
  return reply.send(result)
}

// ─── createActivity ───────────────────────────────────────────────────────────

export async function createActivity(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const body = createActivitySchema.parse(req.body)
  const activity = await service.createActivity(caller, body)
  return reply.status(201).send({ data: activity })
}

// ─── getActivityById ─────────────────────────────────────────────────────────

export async function getActivityById(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const activity = await service.getActivityById(caller, req.params.id)
  return reply.send({ data: activity })
}

// ─── updateActivity ───────────────────────────────────────────────────────────

export async function updateActivity(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const body = updateActivitySchema.parse(req.body)
  const activity = await service.updateActivity(caller, req.params.id, body)
  return reply.send({ data: activity })
}

// ─── deleteActivity ───────────────────────────────────────────────────────────

export async function deleteActivity(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  await service.deleteActivity(caller, req.params.id)
  return reply.status(204).send()
}

// ─── markActivityDone ─────────────────────────────────────────────────────────

export async function markActivityDone(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const body = markDoneSchema.parse(req.body)
  const activity = await service.markActivityDone(caller, req.params.id, body)
  return reply.send({ data: activity })
}
