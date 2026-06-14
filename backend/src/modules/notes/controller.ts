import { FastifyRequest, FastifyReply } from 'fastify'
import { getJwtPayload } from '../../lib/auth'
import * as service from './service'
import {
  createNoteSchema,
  updateNoteSchema,
  listNotesQuerySchema,
} from './schemas'

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listNotes(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const query  = listNotesQuerySchema.parse(req.query)
  const result = await service.listNotes(caller, query)
  return reply.send(result)
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createNote(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const body   = createNoteSchema.parse(req.body)
  const note   = await service.createNote(caller, body)
  return reply.status(201).send({ data: note })
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getNoteById(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const note   = await service.getNoteById(caller, req.params.id)
  return reply.send({ data: note })
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateNote(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const body   = updateNoteSchema.parse(req.body)
  const note   = await service.updateNote(caller, req.params.id, body)
  return reply.send({ data: note })
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteNote(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  await service.deleteNote(caller, req.params.id)
  // API spec: DELETE returns 200 { data: { id } } — not 204
  return reply.send({ data: { id: req.params.id } })
}
