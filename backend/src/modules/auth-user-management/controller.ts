import { FastifyRequest, FastifyReply } from 'fastify'
import { getJwtPayload } from '../../lib/auth'
import * as service from './service'
import {
  acceptInviteSchema,
  forgotPasswordSchema,
  inviteUserSchema,
  listUsersQuerySchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updateUserSchema,
} from './schemas'

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signup(req: FastifyRequest, reply: FastifyReply) {
  const body = signupSchema.parse(req.body)
  const result = await service.signup(req.server, body)
  return reply.status(201).send({ data: result })
}

export async function login(req: FastifyRequest, reply: FastifyReply) {
  const body = loginSchema.parse(req.body)
  const result = await service.login(req.server, body)
  return reply.send({ data: result })
}

export async function logout(_req: FastifyRequest, reply: FastifyReply) {
  return reply.send({ data: {} })
}

export async function forgotPassword(req: FastifyRequest, reply: FastifyReply) {
  const body = forgotPasswordSchema.parse(req.body)
  await service.forgotPassword(body)
  return reply.send({ data: {} })
}

export async function resetPassword(req: FastifyRequest, reply: FastifyReply) {
  const body = resetPasswordSchema.parse(req.body)
  await service.resetPassword(body)
  return reply.send({ data: {} })
}

export async function acceptInvite(req: FastifyRequest, reply: FastifyReply) {
  const body = acceptInviteSchema.parse(req.body)
  const result = await service.acceptInvite(req.server, body)
  return reply.send({ data: result })
}

// ── User management ───────────────────────────────────────────────────────────

export async function listUsers(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const query = listUsersQuerySchema.parse(req.query)
  const result = await service.listUsers(caller, query)
  return reply.send(result)
}

export async function inviteUser(req: FastifyRequest, reply: FastifyReply) {
  const caller = getJwtPayload(req)
  const body = inviteUserSchema.parse(req.body)
  const user = await service.inviteUser(caller, body)
  return reply.status(201).send({ data: user })
}

export async function resendInvite(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const user = await service.resendInvite(caller, req.params.id)
  return reply.send({ data: user })
}

export async function updateUser(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  const body = updateUserSchema.parse(req.body)
  const user = await service.updateUser(caller, req.params.id, body)
  return reply.send({ data: user })
}

export async function deactivateUser(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const caller = getJwtPayload(req)
  await service.deactivateUser(caller, req.params.id)
  return reply.send({ data: {} })
}
