import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import * as repo from '../repository'
import { seedOrganization, seedUser } from '../../../test/helpers'

// ── Local cleanup (only touches tables that exist at this stage) ──────────────
const sql = neon(process.env.DATABASE_URL!)

async function cleanup(orgId: string) {
  await sql`UPDATE users SET deleted_at = NOW() WHERE organization_id = ${orgId} AND deleted_at IS NULL`
  await sql`UPDATE organizations SET deleted_at = NOW() WHERE id = ${orgId} AND deleted_at IS NULL`
}

// ── Shared orgs for isolation tests ──────────────────────────────────────────
let orgA: string
let orgB: string

beforeAll(async () => {
  orgA = await seedOrganization()
  orgB = await seedOrganization()
})

afterAll(async () => {
  await cleanup(orgA)
  await cleanup(orgB)
})

// ── createOrganization ────────────────────────────────────────────────────────

describe('repo.createOrganization', () => {
  let testOrg: string

  afterAll(() => cleanup(testOrg))

  it('auth-int-01: creates organization with id, name, slug', async () => {
    // Arrange + Act
    const org = await repo.createOrganization({ name: 'Int Test Co', slug: `int-test-${Date.now()}` })
    testOrg = org.id

    // Assert
    expect(org.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    expect(org.name).toBe('Int Test Co')
    expect(org.deletedAt).toBeNull()
  })
})

// ── createUser ────────────────────────────────────────────────────────────────

describe('repo.createUser', () => {
  it('auth-int-02: creates user with correct fields and UUID PK', async () => {
    // Act
    const user = await repo.createUser({
      organizationId: orgA,
      firstName: 'Alice',
      lastName: null,
      email: `alice-${Date.now()}@test.com`,
      passwordHash: 'hashed',
      role: 'admin',
      status: 'active',
      inviteToken: null,
      inviteTokenExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      deactivatedAt: null,
      deletedAt: null,
    })

    // Assert
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/i)
    expect(user.organizationId).toBe(orgA)
    expect(user.role).toBe('admin')
    expect(user.deletedAt).toBeNull()
  })
})

// ── findUserByEmailGlobal ─────────────────────────────────────────────────────

describe('repo.findUserByEmailGlobal', () => {
  it('auth-int-03: finds user by email across orgs', async () => {
    // Arrange
    const email = `global-${Date.now()}@test.com`
    await repo.createUser({
      organizationId: orgA,
      firstName: 'Bob',
      lastName: null,
      email,
      passwordHash: 'hashed',
      role: 'sales_rep',
      status: 'active',
      inviteToken: null,
      inviteTokenExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      deactivatedAt: null,
      deletedAt: null,
    })

    // Act
    const found = await repo.findUserByEmailGlobal(email)

    // Assert
    expect(found).toBeDefined()
    expect(found!.email).toBe(email)
  })

  it('auth-int-04: returns undefined for unknown email', async () => {
    const found = await repo.findUserByEmailGlobal('nobody-' + Date.now() + '@test.com')
    expect(found).toBeUndefined()
  })

  it('auth-int-05: does not return soft-deleted user', async () => {
    // Arrange
    const email = `deleted-${Date.now()}@test.com`
    const user = await repo.createUser({
      organizationId: orgA,
      firstName: 'Ghost',
      lastName: null,
      email,
      passwordHash: 'hashed',
      role: 'sales_rep',
      status: 'active',
      inviteToken: null,
      inviteTokenExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      deactivatedAt: null,
      deletedAt: null,
    })
    await repo.softDeleteUser(orgA, user.id)

    // Act
    const found = await repo.findUserByEmailGlobal(email)

    // Assert
    expect(found).toBeUndefined()
  })
})

// ── findUserByEmailInOrg ──────────────────────────────────────────────────────

describe('repo.findUserByEmailInOrg', () => {
  it('auth-int-06: multi-tenancy — org B cannot see org A user by email', async () => {
    // Arrange
    const email = `tenant-${Date.now()}@test.com`
    await repo.createUser({
      organizationId: orgA,
      firstName: 'TenantA',
      lastName: null,
      email,
      passwordHash: 'hashed',
      role: 'sales_rep',
      status: 'active',
      inviteToken: null,
      inviteTokenExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      deactivatedAt: null,
      deletedAt: null,
    })

    // Act — look up with org B's scope
    const found = await repo.findUserByEmailInOrg(orgB, email)

    // Assert — org B cannot see org A's user
    expect(found).toBeUndefined()
  })

  it('auth-int-07: finds user within the correct org', async () => {
    // Arrange
    const email = `scoped-${Date.now()}@test.com`
    await repo.createUser({
      organizationId: orgA,
      firstName: 'Scoped',
      lastName: null,
      email,
      passwordHash: 'hashed',
      role: 'sales_rep',
      status: 'active',
      inviteToken: null,
      inviteTokenExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      deactivatedAt: null,
      deletedAt: null,
    })

    // Act
    const found = await repo.findUserByEmailInOrg(orgA, email)

    // Assert
    expect(found).toBeDefined()
    expect(found!.organizationId).toBe(orgA)
  })
})

// ── findUserById ──────────────────────────────────────────────────────────────

describe('repo.findUserById', () => {
  it('auth-int-08: returns user when id and org match', async () => {
    // Arrange
    const seeded = await seedUser(orgA, 'sales_rep')

    // Act
    const found = await repo.findUserById(orgA, seeded.id)

    // Assert
    expect(found).toBeDefined()
    expect(found!.id).toBe(seeded.id)
  })

  it('auth-int-09: multi-tenancy — org B cannot access org A user by id', async () => {
    // Arrange
    const seeded = await seedUser(orgA, 'sales_rep')

    // Act
    const found = await repo.findUserById(orgB, seeded.id)

    // Assert
    expect(found).toBeUndefined()
  })

  it('auth-int-10: returns undefined after soft delete', async () => {
    // Arrange
    const seeded = await seedUser(orgA, 'sales_rep')
    await repo.softDeleteUser(orgA, seeded.id)

    // Act
    const found = await repo.findUserById(orgA, seeded.id)

    // Assert
    expect(found).toBeUndefined()
  })
})

// ── findManyUsers ─────────────────────────────────────────────────────────────

describe('repo.findManyUsers', () => {
  let listOrgId: string

  beforeAll(async () => {
    listOrgId = await seedOrganization()
    // Seed 3 users: 2 active (one admin, one sales_rep), 1 pending
    await seedUser(listOrgId, 'admin', { firstName: 'Alice' })
    await seedUser(listOrgId, 'sales_rep', { firstName: 'Bob' })
    await seedUser(listOrgId, 'sales_rep', { status: 'pending', firstName: 'Carol' })
  })

  afterAll(() => cleanup(listOrgId))

  it('auth-int-11: returns all users in org', async () => {
    const { data, total } = await repo.findManyUsers(listOrgId, { page: 1, limit: 20 })
    expect(total).toBe(3)
    expect(data).toHaveLength(3)
  })

  it('auth-int-12: multi-tenancy — only returns users from the requested org', async () => {
    const { data } = await repo.findManyUsers(orgA, { page: 1, limit: 100 })
    const outsideOrg = data.filter((u) => u.organizationId !== orgA)
    expect(outsideOrg).toHaveLength(0)
  })

  it('auth-int-13: filters by role', async () => {
    const { data } = await repo.findManyUsers(listOrgId, { page: 1, limit: 20, role: 'admin' })
    expect(data.every((u) => u.role === 'admin')).toBe(true)
  })

  it('auth-int-14: filters by status', async () => {
    const { data } = await repo.findManyUsers(listOrgId, { page: 1, limit: 20, status: 'pending' })
    expect(data.every((u) => u.status === 'pending')).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  it('auth-int-15: pagination works — page 2 returns remaining records', async () => {
    const page1 = await repo.findManyUsers(listOrgId, { page: 1, limit: 2 })
    const page2 = await repo.findManyUsers(listOrgId, { page: 2, limit: 2 })
    expect(page1.data).toHaveLength(2)
    expect(page2.data).toHaveLength(1)
    expect(page1.total).toBe(3)
  })

  it('auth-int-16: soft-deleted users not included in list', async () => {
    // Arrange — seed an extra user and delete them
    const extra = await seedUser(listOrgId, 'sales_rep')
    await repo.softDeleteUser(listOrgId, extra.id)

    // Act
    const { data } = await repo.findManyUsers(listOrgId, { page: 1, limit: 100 })

    // Assert — extra user not returned
    expect(data.find((u) => u.id === extra.id)).toBeUndefined()
  })
})

// ── softDeleteUser ────────────────────────────────────────────────────────────

describe('repo.softDeleteUser', () => {
  it('auth-int-17: sets deleted_at but record still exists in DB', async () => {
    // Arrange
    const seeded = await seedUser(orgA, 'sales_rep')

    // Act
    await repo.softDeleteUser(orgA, seeded.id)

    // Assert — not returned by regular query
    const found = await repo.findUserById(orgA, seeded.id)
    expect(found).toBeUndefined()

    // Assert — still physically exists in DB
    const [raw] = await sql`
      SELECT id, deleted_at FROM users WHERE id = ${seeded.id}
    `
    expect(raw).toBeDefined()
    expect(raw.deleted_at).not.toBeNull()
  })

  it('auth-int-18: multi-tenancy — cannot soft-delete user from another org', async () => {
    // Arrange — seed user in orgA
    const seeded = await seedUser(orgA, 'sales_rep')

    // Act — attempt delete scoped to orgB
    await repo.softDeleteUser(orgB, seeded.id)

    // Assert — user in orgA is unaffected
    const found = await repo.findUserById(orgA, seeded.id)
    expect(found).toBeDefined()
  })
})

// ── countActiveAdmins ─────────────────────────────────────────────────────────

describe('repo.countActiveAdmins', () => {
  it('auth-int-19: counts only active admins, not deactivated or other roles', async () => {
    // Arrange
    const countOrg = await seedOrganization()
    await seedUser(countOrg, 'admin')
    await seedUser(countOrg, 'admin', { status: 'deactivated' })
    await seedUser(countOrg, 'sales_rep')

    // Act
    const count = await repo.countActiveAdmins(countOrg)

    // Assert
    expect(count).toBe(1)

    await cleanup(countOrg)
  })
})

// ── updateUser ────────────────────────────────────────────────────────────────

describe('repo.updateUser', () => {
  it('auth-int-20: updates role and returns updated record', async () => {
    // Arrange
    const seeded = await seedUser(orgA, 'sales_rep')

    // Act
    const updated = await repo.updateUser(orgA, seeded.id, { role: 'manager' })

    // Assert
    expect(updated).toBeDefined()
    expect(updated!.role).toBe('manager')
  })

  it('auth-int-21: multi-tenancy — cannot update user from another org', async () => {
    // Arrange
    const seeded = await seedUser(orgA, 'sales_rep')

    // Act — attempt update with orgB scope
    const result = await repo.updateUser(orgB, seeded.id, { role: 'manager' })

    // Assert — returns undefined (no rows updated)
    expect(result).toBeUndefined()

    // Verify the original user in orgA is unchanged
    const unchanged = await repo.findUserById(orgA, seeded.id)
    expect(unchanged!.role).toBe('sales_rep')
  })
})
