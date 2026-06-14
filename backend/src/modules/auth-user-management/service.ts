import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { FastifyInstance } from 'fastify'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from '../../lib/errors'
import { JWTPayload } from '../../lib/auth'
import { buildPaginationMeta } from '../../lib/pagination'
import { User } from '../../db/schema/users'
import * as repo from './repository'
import type {
  AcceptInviteInput,
  ForgotPasswordInput,
  InviteUserInput,
  ListUsersQuery,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  UpdateUserInput,
} from './schemas'

const BCRYPT_ROUNDS = 12
const INVITE_TTL_MS = 72 * 60 * 60 * 1000
const RESET_TTL_MS = 60 * 60 * 1000

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 90)
  return `${base}-${Date.now().toString(36)}`
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function sanitizeUser(user: User): Omit<User, 'passwordHash' | 'inviteToken' | 'passwordResetToken'> {
  const { passwordHash: _, inviteToken: __, passwordResetToken: ___, ...safe } = user
  return safe
}

function signToken(fastify: FastifyInstance, user: User): string {
  return fastify.jwt.sign(
    {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
    },
    { expiresIn: '24h' },
  )
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signup(fastify: FastifyInstance, input: SignupInput) {
  // Check if email is already used globally (enforce unique identity at signup)
  const existing = await repo.findUserByEmailGlobal(input.email)
  if (existing) {
    throw new ConflictError('A user with this email already exists.')
  }

  const slug = generateSlug(input.orgName)
  const org = await repo.createOrganization({ name: input.orgName, slug })

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
  const user = await repo.createUser({
    organizationId: org.id,
    firstName: input.firstName,
    lastName: null,
    email: input.email.toLowerCase(),
    passwordHash,
    role: 'admin',
    status: 'active',
    inviteToken: null,
    inviteTokenExpiresAt: null,
    passwordResetToken: null,
    passwordResetExpiresAt: null,
    deactivatedAt: null,
    deletedAt: null,
  })

  const token = signToken(fastify, user)
  return { token, user: sanitizeUser(user) }
}

export async function login(fastify: FastifyInstance, input: LoginInput) {
  const user = await repo.findUserByEmailGlobal(input.email)
  if (!user) {
    throw new UnauthorizedError()
  }

  // BR-06: deactivated users cannot log in
  if (user.status === 'deactivated') {
    throw new ForbiddenError('Your account has been deactivated. Contact your admin.')
  }

  const passwordMatch = await bcrypt.compare(input.password, user.passwordHash)
  if (!passwordMatch) {
    throw new UnauthorizedError()
  }

  // Pending users (invite not yet accepted) cannot log in with a password
  if (user.status === 'pending') {
    throw new UnauthorizedError()
  }

  const token = signToken(fastify, user)
  return { token, user: sanitizeUser(user) }
}

export async function logout() {
  // JWT is stateless — client clears the token. Nothing to do server-side in MVP.
  return {}
}

export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await repo.findUserByEmailGlobal(input.email)
  if (!user) {
    // BR: never reveal whether the email exists
    return {}
  }

  const resetToken = generateToken()
  const expiresAt = new Date(Date.now() + RESET_TTL_MS)

  await repo.updateUser(user.organizationId, user.id, {
    passwordResetToken: resetToken,
    passwordResetExpiresAt: expiresAt,
  })

  // TODO: send email via SMTP in production
  console.info(
    `[DEV] Password reset token for ${user.email}: ${resetToken} (expires ${expiresAt.toISOString()})`,
  )
  return {}
}

export async function resetPassword(input: ResetPasswordInput) {
  const user = await repo.findUserByResetToken(input.token)
  if (!user || !user.passwordResetExpiresAt) {
    throw new UnprocessableError('This reset link has expired.')
  }

  // BR-07: reset token expires after 1 hour
  if (user.passwordResetExpiresAt < new Date()) {
    throw new UnprocessableError('This reset link has expired.')
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
  await repo.updateUser(user.organizationId, user.id, {
    passwordHash,
    passwordResetToken: null,
    passwordResetExpiresAt: null,
  })
  return {}
}

export async function acceptInvite(fastify: FastifyInstance, input: AcceptInviteInput) {
  const user = await repo.findUserByInviteToken(input.token)
  if (!user || !user.inviteTokenExpiresAt) {
    throw new UnprocessableError('This invite link has expired. Ask your admin to resend it.')
  }

  // BR-03: invite token expires after 72 hours
  if (user.inviteTokenExpiresAt < new Date()) {
    throw new UnprocessableError('This invite link has expired. Ask your admin to resend it.')
  }

  const [firstName, ...rest] = input.name.trim().split(' ')
  const lastName = rest.length > 0 ? rest.join(' ') : null

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
  const updated = await repo.updateUser(user.organizationId, user.id, {
    firstName,
    lastName,
    passwordHash,
    status: 'active',
    inviteToken: null,
    inviteTokenExpiresAt: null,
  })

  if (!updated) throw new NotFoundError('User')

  const token = signToken(fastify, updated)
  return { token, user: sanitizeUser(updated) }
}

// ── User management ───────────────────────────────────────────────────────────

export async function listUsers(caller: JWTPayload, query: ListUsersQuery) {
  const { data, total } = await repo.findManyUsers(caller.organizationId, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    role: query.role,
    status: query.status,
    order: query.order,
  })

  const sanitized = data.map(sanitizeUser)
  const pagination = buildPaginationMeta({ page: query.page, limit: query.limit }, total)
  return { data: sanitized, pagination }
}

export async function inviteUser(caller: JWTPayload, input: InviteUserInput) {
  // Check email uniqueness within the organisation
  const existing = await repo.findUserByEmailInOrg(caller.organizationId, input.email)
  if (existing) {
    throw new ConflictError('A user with this email already exists in your team.')
  }

  const inviteToken = generateToken()
  const inviteTokenExpiresAt = new Date(Date.now() + INVITE_TTL_MS)

  const user = await repo.createUser({
    organizationId: caller.organizationId,
    firstName: input.firstName ?? '',
    lastName: null,
    email: input.email.toLowerCase(),
    passwordHash: '',
    role: input.role,
    status: 'pending',
    inviteToken,
    inviteTokenExpiresAt,
    passwordResetToken: null,
    passwordResetExpiresAt: null,
    deactivatedAt: null,
    deletedAt: null,
  })

  // TODO: send invite email via SMTP in production
  console.info(
    `[DEV] Invite token for ${user.email}: ${inviteToken} (expires ${inviteTokenExpiresAt.toISOString()})`,
  )

  return sanitizeUser(user)
}

export async function resendInvite(caller: JWTPayload, userId: string) {
  const user = await repo.findUserById(caller.organizationId, userId)
  if (!user) throw new NotFoundError('User')

  if (user.status !== 'pending') {
    throw new UnprocessableError('Can only resend invite to pending users.')
  }

  const inviteToken = generateToken()
  const inviteTokenExpiresAt = new Date(Date.now() + INVITE_TTL_MS)

  const updated = await repo.updateUser(caller.organizationId, userId, {
    inviteToken,
    inviteTokenExpiresAt,
  })

  if (!updated) throw new NotFoundError('User')

  // TODO: send invite email via SMTP in production
  console.info(
    `[DEV] Resent invite token for ${user.email}: ${inviteToken} (expires ${inviteTokenExpiresAt.toISOString()})`,
  )

  return sanitizeUser(updated)
}

export async function updateUser(
  caller: JWTPayload,
  userId: string,
  input: UpdateUserInput,
) {
  const user = await repo.findUserById(caller.organizationId, userId)
  if (!user) throw new NotFoundError('User')

  // BR-01/BR-02: last admin guard when deactivating
  if (input.status === 'deactivated') {
    if (user.role === 'admin') {
      const adminCount = await repo.countActiveAdmins(caller.organizationId)
      if (adminCount <= 1) {
        throw new UnprocessableError(
          'Cannot deactivate the last admin. Assign another admin first.',
        )
      }
    }
  }

  // Downgrading from admin: last admin guard
  if (input.role && user.role === 'admin' && input.role !== 'admin') {
    const adminCount = await repo.countActiveAdmins(caller.organizationId)
    if (adminCount <= 1) {
      throw new UnprocessableError(
        'Cannot change role of the last admin. Assign another admin first.',
      )
    }
  }

  const updates: Partial<typeof user> = {}
  if (input.role) updates.role = input.role
  if (input.status === 'deactivated') {
    updates.status = 'deactivated'
    updates.deactivatedAt = new Date()
  }
  if (input.status === 'active') {
    updates.status = 'active'
    updates.deactivatedAt = null
  }

  const updated = await repo.updateUser(caller.organizationId, userId, updates)
  if (!updated) throw new NotFoundError('User')

  return sanitizeUser(updated)
}

export async function deactivateUser(caller: JWTPayload, userId: string) {
  const user = await repo.findUserById(caller.organizationId, userId)
  if (!user) throw new NotFoundError('User')

  // BR-02: cannot deactivate yourself if you are the last admin
  if (caller.sub === userId && caller.role === 'admin') {
    const adminCount = await repo.countActiveAdmins(caller.organizationId)
    if (adminCount <= 1) {
      throw new UnprocessableError(
        'Cannot deactivate the last admin. Assign another admin first.',
      )
    }
  }

  // BR-01: general last admin guard
  if (user.role === 'admin') {
    const adminCount = await repo.countActiveAdmins(caller.organizationId)
    if (adminCount <= 1) {
      throw new UnprocessableError(
        'Cannot deactivate the last admin. Assign another admin first.',
      )
    }
  }

  await repo.updateUser(caller.organizationId, userId, {
    status: 'deactivated',
    deactivatedAt: new Date(),
  })
  return {}
}
