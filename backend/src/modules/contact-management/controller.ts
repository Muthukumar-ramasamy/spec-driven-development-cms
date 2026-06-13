import { FastifyRequest, FastifyReply } from 'fastify'
import { getJwtPayload } from '../../lib/auth'
import * as service from './service'
import {
  createContactSchema,
  updateContactSchema,
  listContactsQuerySchema,
} from './schemas'

export async function listContacts(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const query = listContactsQuerySchema.parse(req.query)
  const result = await service.listContacts(caller, query)
  return reply.send(result)
}

export async function createContact(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const body = createContactSchema.parse(req.body)
  const contact = await service.createContact(caller, body)
  return reply.status(201).send({ data: contact })
}

export async function getContactById(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const contact = await service.getContactById(caller, req.params.id)
  return reply.send({ data: contact })
}

export async function updateContact(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const body = updateContactSchema.parse(req.body)
  const contact = await service.updateContact(caller, req.params.id, body)
  return reply.send({ data: contact })
}

export async function deleteContact(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  await service.deleteContact(caller, req.params.id)
  return reply.status(204).send()
}
