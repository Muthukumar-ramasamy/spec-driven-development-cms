import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError } from '../../../lib/errors'
import type { User } from '../../../db/schema/users'
import * as service from '../service'
import * as repo from '../repository'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../repository')
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-pw'),
    compare: vi.fn(),
  },
}))

const mockFastify = {
  jwt: { sign: vi.fn().mockReturnValue('mock-jwt-token') },
} as unknown as FastifyInstance

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ORG_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = '00000000-0000-0000-0000-000000000002'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    organizationId: ORG_ID,
    firstName: 'Sam',
    lastName: null,
    email: 'sam@example.com',
    passwordHash: 'hashed-pw',
    role: 'admin',
    status: 'active',
    inviteToken: null,
    inviteTokenExpiresAt: null,
    passwordResetToken: null,
    passwordResetExpiresAt: null,
    deactivatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

const mockCaller = {
  sub: USER_ID,
  organizationId: ORG_ID,
  role: 'admin' as const,
  iat: 0,
  exp: 9999999999,
}

// ── signup() ──────────────────────────────────────────────────────────────────

describe('service.signup', () => {
  beforeEach(() => vi.resetAllMocks())

  it('auth-unit-01: creates org and admin user, returns token + user', async () => {
    // Arrange
    vi.mocked(repo.findUserByEmailGlobal).mockResolvedValue(undefined)
    vi.mocked(repo.createOrganization).mockResolvedValue({
      id: ORG_ID,
      name: 'Acme',
      slug: 'acme-abc',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    })
    vi.mocked(repo.createUser).mockResolvedValue(makeUser({ role: 'admin', status: 'active' }))

    // Act
    const result = await service.signup(mockFastify, {
      orgName: 'Acme',
      firstName: 'Sam',
      email: 'sam@example.com',
      password: 'password123',
    })

    // Assert
    expect(result.token).toBe('mock-jwt-token')
    expect(result.user.role).toBe('admin')
    expect(result.user).not.toHaveProperty('passwordHash')
    expect(repo.createOrganization).toHaveBeenCalledOnce()
    expect(repo.createUser).toHaveBeenCalledOnce()
  })

  it('auth-unit-02: throws ConflictError when email already exists globally', async () => {
    // Arrange
    vi.mocked(repo.findUserByEmailGlobal).mockResolvedValue(makeUser())

    // Act & Assert
    await expect(
      service.signup(mockFastify, {
        orgName: 'Acme',
        firstName: 'Sam',
        email: 'sam@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(ConflictError)
    expect(repo.createOrganization).not.toHaveBeenCalled()
  })

  it('auth-unit-03: JWT payload contains sub, organizationId, role', async () => {
    // Arrange
    vi.mocked(repo.findUserByEmailGlobal).mockResolvedValue(undefined)
    vi.mocked(repo.createOrganization).mockResolvedValue({
      id: ORG_ID,
      name: 'Acme',
      slug: 'acme-abc',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    })
    vi.mocked(repo.createUser).mockResolvedValue(makeUser({ role: 'admin', status: 'active' }))

    // Act
    await service.signup(mockFastify, {
      orgName: 'Acme',
      firstName: 'Sam',
      email: 'sam@example.com',
      password: 'password123',
    })

    // Assert
    const signCall = vi.mocked(mockFastify.jwt.sign).mock.calls[0]
    expect(signCall[0]).toMatchObject({
      sub: USER_ID,
      organizationId: ORG_ID,
      role: 'admin',
    })
  })
})

// ── login() ───────────────────────────────────────────────────────────────────

describe('service.login', () => {
  beforeEach(() => vi.resetAllMocks())

  it('auth-unit-04: returns token for valid credentials', async () => {
    // Arrange
    const { default: bcrypt } = await import('bcryptjs')
    vi.mocked(repo.findUserByEmailGlobal).mockResolvedValue(makeUser({ status: 'active' }))
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    // Act
    const result = await service.login(mockFastify, {
      email: 'sam@example.com',
      password: 'correct-password',
    })

    // Assert
    expect(result.token).toBe('mock-jwt-token')
    expect(result.user).not.toHaveProperty('passwordHash')
  })

  it('auth-unit-05: throws UNAUTHORIZED for wrong password', async () => {
    // Arrange
    const { default: bcrypt } = await import('bcryptjs')
    vi.mocked(repo.findUserByEmailGlobal).mockResolvedValue(makeUser({ status: 'active' }))
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    // Act & Assert
    await expect(
      service.login(mockFastify, { email: 'sam@example.com', password: 'wrong' }),
    ).rejects.toThrow('UNAUTHORIZED')
  })

  it('auth-unit-06: throws UNAUTHORIZED for unknown email', async () => {
    // Arrange
    vi.mocked(repo.findUserByEmailGlobal).mockResolvedValue(undefined)

    // Act & Assert
    await expect(
      service.login(mockFastify, { email: 'nobody@example.com', password: 'pw' }),
    ).rejects.toThrow('UNAUTHORIZED')
  })

  it('auth-unit-07: throws ForbiddenError for deactivated user (BR-06)', async () => {
    // Arrange
    vi.mocked(repo.findUserByEmailGlobal).mockResolvedValue(makeUser({ status: 'deactivated' }))

    // Act & Assert
    await expect(
      service.login(mockFastify, { email: 'sam@example.com', password: 'pw' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('auth-unit-08: throws UNAUTHORIZED for pending (invite not accepted) user', async () => {
    // Arrange
    const { default: bcrypt } = await import('bcryptjs')
    vi.mocked(repo.findUserByEmailGlobal).mockResolvedValue(makeUser({ status: 'pending' }))
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    // Act & Assert
    await expect(
      service.login(mockFastify, { email: 'sam@example.com', password: 'pw' }),
    ).rejects.toThrow('UNAUTHORIZED')
  })
})

// ── inviteUser() ──────────────────────────────────────────────────────────────

describe('service.inviteUser', () => {
  beforeEach(() => vi.resetAllMocks())

  it('auth-unit-09: creates pending user with invite token set', async () => {
    // Arrange
    vi.mocked(repo.findUserByEmailInOrg).mockResolvedValue(undefined)
    const pendingUser = makeUser({ status: 'pending', role: 'sales_rep' })
    vi.mocked(repo.createUser).mockResolvedValue(pendingUser)

    // Act
    const result = await service.inviteUser(mockCaller, {
      email: 'new@example.com',
      role: 'sales_rep',
    })

    // Assert
    expect(result.status).toBe('pending')
    expect(repo.createUser).toHaveBeenCalledOnce()
    // Verify no sensitive fields are returned
    expect(result).not.toHaveProperty('passwordHash')
    expect(result).not.toHaveProperty('inviteToken')
  })

  it('auth-unit-10: throws ConflictError when email already in org (BR-05)', async () => {
    // Arrange
    vi.mocked(repo.findUserByEmailInOrg).mockResolvedValue(makeUser())

    // Act & Assert
    await expect(
      service.inviteUser(mockCaller, { email: 'sam@example.com', role: 'manager' }),
    ).rejects.toThrow(ConflictError)
    expect(repo.createUser).not.toHaveBeenCalled()
  })
})

// ── acceptInvite() ────────────────────────────────────────────────────────────

describe('service.acceptInvite', () => {
  beforeEach(() => vi.resetAllMocks())

  it('auth-unit-11: activates user, clears token, returns JWT', async () => {
    // Arrange
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
    vi.mocked(repo.findUserByInviteToken).mockResolvedValue(
      makeUser({ status: 'pending', inviteToken: 'valid-token', inviteTokenExpiresAt: expiresAt }),
    )
    const activeUser = makeUser({ status: 'active', inviteToken: null })
    vi.mocked(repo.updateUser).mockResolvedValue(activeUser)

    // Act
    const result = await service.acceptInvite(mockFastify, {
      token: 'valid-token',
      name: 'Sam Lee',
      password: 'newpassword1',
    })

    // Assert
    expect(result.token).toBe('mock-jwt-token')
    expect(repo.updateUser).toHaveBeenCalledWith(
      ORG_ID,
      USER_ID,
      expect.objectContaining({ status: 'active', inviteToken: null }),
    )
  })

  it('auth-unit-12: throws UnprocessableError for expired invite token (BR-03)', async () => {
    // Arrange
    const expiredAt = new Date(Date.now() - 1000) // past
    vi.mocked(repo.findUserByInviteToken).mockResolvedValue(
      makeUser({ status: 'pending', inviteToken: 'expired-token', inviteTokenExpiresAt: expiredAt }),
    )

    // Act & Assert
    await expect(
      service.acceptInvite(mockFastify, {
        token: 'expired-token',
        name: 'Sam',
        password: 'newpassword1',
      }),
    ).rejects.toThrow(UnprocessableError)
  })

  it('auth-unit-13: throws UnprocessableError for unknown invite token', async () => {
    // Arrange
    vi.mocked(repo.findUserByInviteToken).mockResolvedValue(undefined)

    // Act & Assert
    await expect(
      service.acceptInvite(mockFastify, {
        token: 'does-not-exist',
        name: 'Sam',
        password: 'newpassword1',
      }),
    ).rejects.toThrow(UnprocessableError)
  })
})

// ── deactivateUser() ──────────────────────────────────────────────────────────

describe('service.deactivateUser', () => {
  beforeEach(() => vi.resetAllMocks())

  it('auth-unit-14: deactivates a non-admin user successfully', async () => {
    // Arrange
    vi.mocked(repo.findUserById).mockResolvedValue(
      makeUser({ id: 'other-id', role: 'sales_rep', status: 'active' }),
    )

    // Act
    await service.deactivateUser(mockCaller, 'other-id')

    // Assert
    expect(repo.updateUser).toHaveBeenCalledWith(
      ORG_ID,
      'other-id',
      expect.objectContaining({ status: 'deactivated' }),
    )
  })

  it('auth-unit-15: throws UnprocessableError when deactivating last admin (BR-01)', async () => {
    // Arrange
    const otherAdminId = 'other-admin-id'
    vi.mocked(repo.findUserById).mockResolvedValue(
      makeUser({ id: otherAdminId, role: 'admin', status: 'active' }),
    )
    vi.mocked(repo.countActiveAdmins).mockResolvedValue(1)

    // Act & Assert
    await expect(service.deactivateUser(mockCaller, otherAdminId)).rejects.toThrow(
      UnprocessableError,
    )
    expect(repo.updateUser).not.toHaveBeenCalled()
  })

  it('auth-unit-16: throws NotFoundError when user not found', async () => {
    // Arrange
    vi.mocked(repo.findUserById).mockResolvedValue(undefined)

    // Act & Assert
    await expect(service.deactivateUser(mockCaller, 'ghost-id')).rejects.toThrow(NotFoundError)
  })
})

// ── updateUser() ──────────────────────────────────────────────────────────────

describe('service.updateUser', () => {
  beforeEach(() => vi.resetAllMocks())

  it('auth-unit-17: changes user role successfully', async () => {
    // Arrange
    vi.mocked(repo.findUserById).mockResolvedValue(
      makeUser({ id: 'target', role: 'sales_rep', status: 'active' }),
    )
    vi.mocked(repo.updateUser).mockResolvedValue(makeUser({ id: 'target', role: 'manager' }))

    // Act
    const result = await service.updateUser(mockCaller, 'target', { role: 'manager' })

    // Assert
    expect(repo.updateUser).toHaveBeenCalledWith(
      ORG_ID,
      'target',
      expect.objectContaining({ role: 'manager' }),
    )
    expect(result).not.toHaveProperty('passwordHash')
  })

  it('auth-unit-18: throws UnprocessableError when downgrading last admin (BR-01)', async () => {
    // Arrange
    vi.mocked(repo.findUserById).mockResolvedValue(
      makeUser({ id: 'target', role: 'admin', status: 'active' }),
    )
    vi.mocked(repo.countActiveAdmins).mockResolvedValue(1)

    // Act & Assert
    await expect(
      service.updateUser(mockCaller, 'target', { role: 'manager' }),
    ).rejects.toThrow(UnprocessableError)
  })

  it('auth-unit-19: throws NotFoundError when user not found', async () => {
    // Arrange
    vi.mocked(repo.findUserById).mockResolvedValue(undefined)

    // Act & Assert
    await expect(
      service.updateUser(mockCaller, 'ghost-id', { role: 'manager' }),
    ).rejects.toThrow(NotFoundError)
  })
})

// ── resendInvite() ────────────────────────────────────────────────────────────

describe('service.resendInvite', () => {
  beforeEach(() => vi.resetAllMocks())

  it('auth-unit-20: regenerates invite token for pending user', async () => {
    // Arrange
    vi.mocked(repo.findUserById).mockResolvedValue(makeUser({ status: 'pending' }))
    vi.mocked(repo.updateUser).mockResolvedValue(makeUser({ status: 'pending' }))

    // Act
    await service.resendInvite(mockCaller, USER_ID)

    // Assert
    expect(repo.updateUser).toHaveBeenCalledWith(
      ORG_ID,
      USER_ID,
      expect.objectContaining({ inviteToken: expect.any(String), inviteTokenExpiresAt: expect.any(Date) }),
    )
  })

  it('auth-unit-21: throws UnprocessableError when user is not pending', async () => {
    // Arrange
    vi.mocked(repo.findUserById).mockResolvedValue(makeUser({ status: 'active' }))

    // Act & Assert
    await expect(service.resendInvite(mockCaller, USER_ID)).rejects.toThrow(UnprocessableError)
  })

  it('auth-unit-22: throws NotFoundError when user not found', async () => {
    // Arrange
    vi.mocked(repo.findUserById).mockResolvedValue(undefined)

    // Act & Assert
    await expect(service.resendInvite(mockCaller, 'ghost-id')).rejects.toThrow(NotFoundError)
  })
})

// ── resetPassword() ───────────────────────────────────────────────────────────

describe('service.resetPassword', () => {
  beforeEach(() => vi.resetAllMocks())

  it('auth-unit-23: updates password hash and clears reset token (BR-07)', async () => {
    // Arrange
    const validExpiry = new Date(Date.now() + 60 * 60 * 1000)
    vi.mocked(repo.findUserByResetToken).mockResolvedValue(
      makeUser({ passwordResetToken: 'valid-token', passwordResetExpiresAt: validExpiry }),
    )
    vi.mocked(repo.updateUser).mockResolvedValue(makeUser())

    // Act
    await service.resetPassword({ token: 'valid-token', password: 'newpassword1' })

    // Assert
    expect(repo.updateUser).toHaveBeenCalledWith(
      ORG_ID,
      USER_ID,
      expect.objectContaining({
        passwordHash: 'hashed-pw',
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      }),
    )
  })

  it('auth-unit-24: throws UnprocessableError for expired reset token (BR-07)', async () => {
    // Arrange
    const expiredAt = new Date(Date.now() - 1000)
    vi.mocked(repo.findUserByResetToken).mockResolvedValue(
      makeUser({ passwordResetToken: 'expired', passwordResetExpiresAt: expiredAt }),
    )

    // Act & Assert
    await expect(
      service.resetPassword({ token: 'expired', password: 'newpassword1' }),
    ).rejects.toThrow(UnprocessableError)
  })

  it('auth-unit-25: throws UnprocessableError for unknown token', async () => {
    // Arrange
    vi.mocked(repo.findUserByResetToken).mockResolvedValue(undefined)

    // Act & Assert
    await expect(
      service.resetPassword({ token: 'unknown', password: 'newpassword1' }),
    ).rejects.toThrow(UnprocessableError)
  })
})

// ── forgotPassword() ──────────────────────────────────────────────────────────

describe('service.forgotPassword', () => {
  beforeEach(() => vi.resetAllMocks())

  it('auth-unit-26: stores reset token when email found', async () => {
    // Arrange
    vi.mocked(repo.findUserByEmailGlobal).mockResolvedValue(makeUser())
    vi.mocked(repo.updateUser).mockResolvedValue(makeUser())

    // Act
    await service.forgotPassword({ email: 'sam@example.com' })

    // Assert
    expect(repo.updateUser).toHaveBeenCalledWith(
      ORG_ID,
      USER_ID,
      expect.objectContaining({
        passwordResetToken: expect.any(String),
        passwordResetExpiresAt: expect.any(Date),
      }),
    )
  })

  it('auth-unit-27: returns {} without error when email not found (privacy-safe)', async () => {
    // Arrange
    vi.mocked(repo.findUserByEmailGlobal).mockResolvedValue(undefined)

    // Act
    const result = await service.forgotPassword({ email: 'nobody@example.com' })

    // Assert
    expect(result).toEqual({})
    expect(repo.updateUser).not.toHaveBeenCalled()
  })
})
