import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../../app'
import {
  seedOrganization,
  seedUser,
  createTestToken,
  cleanupOrg,
} from '../../../test/helpers'

const app = buildApp()

let orgAId: string
let orgBId: string
let adminUser: { id: string; organizationId: string; role: string }
let managerUser: { id: string; organizationId: string; role: string }
let repA: { id: string; organizationId: string; role: string }
let repB: { id: string; organizationId: string; role: string }
let adminToken: string
let managerToken: string
let repAToken: string
let repBToken: string
let orgBRepToken: string

beforeAll(async () => {
  await app.ready()

  orgAId = await seedOrganization()
  orgBId = await seedOrganization()

  adminUser = await seedUser(orgAId, 'admin')
  managerUser = await seedUser(orgAId, 'manager')
  repA = await seedUser(orgAId, 'sales_rep')
  repB = await seedUser(orgAId, 'sales_rep')

  const orgBRep = await seedUser(orgBId, 'sales_rep')

  adminToken = createTestToken(adminUser)
  managerToken = createTestToken(managerUser)
  repAToken = createTestToken(repA)
  repBToken = createTestToken(repB)
  orgBRepToken = createTestToken(orgBRep)
})

afterAll(async () => {
  await cleanupOrg(orgAId)
  await cleanupOrg(orgBId)
  await app.close()
})

// ---------------------------------------------------------------------------
// Helper: create a contact via API
// ---------------------------------------------------------------------------
async function createContact(
  token: string,
  body: Record<string, unknown> = { firstName: 'Test' },
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/contacts',
    headers: { authorization: `Bearer ${token}` },
    payload: body,
  })
  return JSON.parse(res.body)
}

// ---------------------------------------------------------------------------
// GET /api/contacts
// ---------------------------------------------------------------------------
describe('GET /api/contacts', () => {
  it('contacts-int-01: returns paginated list for authenticated user', async () => {
    await createContact(repAToken, { firstName: 'Paginated' })

    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts',
      headers: { authorization: `Bearer ${repAToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data).toBeInstanceOf(Array)
    expect(body.pagination).toMatchObject({ page: 1, limit: 20 })
  })

  it('contacts-int-02: org isolation — org B cannot see org A contacts', async () => {
    await createContact(repAToken, { firstName: 'OrgAOnly' })

    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts',
      headers: { authorization: `Bearer ${orgBRepToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const names = body.data.map((c: { firstName: string }) => c.firstName)
    expect(names).not.toContain('OrgAOnly')
  })

  it('contacts-int-03: soft-deleted contacts not returned', async () => {
    const created = await createContact(adminToken, { firstName: 'ToDelete' })
    const contactId = created.data.id

    await app.inject({
      method: 'DELETE',
      url: `/api/contacts/${contactId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const body = JSON.parse(res.body)
    const ids = body.data.map((c: { id: string }) => c.id)
    expect(ids).not.toContain(contactId)
  })

  it('contacts-int-04: search by partial name returns matching contacts', async () => {
    await createContact(repAToken, { firstName: 'Juliette' })

    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts?search=juli',
      headers: { authorization: `Bearer ${repAToken}` },
    })

    const body = JSON.parse(res.body)
    expect(body.data.some((c: { firstName: string }) => c.firstName === 'Juliette')).toBe(true)
  })

  it('contacts-int-sales-rep-scoped: sales rep only sees own contacts', async () => {
    await createContact(repAToken, { firstName: 'RepAContact' })
    await createContact(repBToken, { firstName: 'RepBContact' })

    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts',
      headers: { authorization: `Bearer ${repAToken}` },
    })

    const body = JSON.parse(res.body)
    const names = body.data.map((c: { firstName: string }) => c.firstName)
    expect(names).not.toContain('RepBContact')
  })

  it('contacts-int-manager-all: manager sees all org contacts', async () => {
    await createContact(repAToken, { firstName: 'ForManagerView' })

    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts',
      headers: { authorization: `Bearer ${managerToken}` },
    })

    const body = JSON.parse(res.body)
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// POST /api/contacts
// ---------------------------------------------------------------------------
describe('POST /api/contacts', () => {
  it('contacts-int-05: returns 201 for valid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/contacts',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { firstName: 'NewContact' },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.data.firstName).toBe('NewContact')
    expect(body.data.ownerId).toBe(repA.id)
  })

  it('contacts-int-06: returns 409 for duplicate email in org', async () => {
    const email = `dup-${Date.now()}@test.com`
    await createContact(repAToken, { firstName: 'First', email })

    const res = await app.inject({
      method: 'POST',
      url: '/api/contacts',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { firstName: 'Second', email },
    })

    expect(res.statusCode).toBe(409)
    const body = JSON.parse(res.body)
    expect(body.message).toMatch(/email already exists/i)
  })

  it('contacts-int-07: returns 400 for missing first_name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/contacts',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { email: 'no-name@test.com' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('contacts-int-unauth: returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/contacts',
      payload: { firstName: 'Ghost' },
    })

    expect(res.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// GET /api/contacts/:id
// ---------------------------------------------------------------------------
describe('GET /api/contacts/:id', () => {
  it('contacts-int-get-owned: owner can view own contact', async () => {
    const created = await createContact(repAToken, { firstName: 'OwnedByRepA' })
    const contactId = created.data.id

    const res = await app.inject({
      method: 'GET',
      url: `/api/contacts/${contactId}`,
      headers: { authorization: `Bearer ${repAToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.id).toBe(contactId)
  })

  it('contacts-int-get-forbidden: sales rep cannot view another rep contact', async () => {
    const created = await createContact(repAToken, { firstName: 'RepAPrivate' })
    const contactId = created.data.id

    const res = await app.inject({
      method: 'GET',
      url: `/api/contacts/${contactId}`,
      headers: { authorization: `Bearer ${repBToken}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('contacts-int-get-404: returns 404 for non-existent contact', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(404)
  })

  it('contacts-int-get-org-isolation: cannot view contact from another org', async () => {
    const created = await createContact(repAToken, { firstName: 'CrossOrgTest' })
    const contactId = created.data.id

    const res = await app.inject({
      method: 'GET',
      url: `/api/contacts/${contactId}`,
      headers: { authorization: `Bearer ${orgBRepToken}` },
    })

    expect([403, 404]).toContain(res.statusCode)
  })
})

// ---------------------------------------------------------------------------
// PUT /api/contacts/:id
// ---------------------------------------------------------------------------
describe('PUT /api/contacts/:id', () => {
  it('contacts-int-08: owner can update their contact', async () => {
    const created = await createContact(repAToken, { firstName: 'BeforeUpdate' })
    const contactId = created.data.id

    const res = await app.inject({
      method: 'PUT',
      url: `/api/contacts/${contactId}`,
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { firstName: 'AfterUpdate' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.firstName).toBe('AfterUpdate')
  })

  it('contacts-int-09: returns 403 when sales rep edits another rep contact', async () => {
    const created = await createContact(repAToken, { firstName: 'RepAForbidden' })
    const contactId = created.data.id

    const res = await app.inject({
      method: 'PUT',
      url: `/api/contacts/${contactId}`,
      headers: { authorization: `Bearer ${repBToken}` },
      payload: { firstName: 'Hacked' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('contacts-int-09b: returns 403 when sales rep tries to reassign owner', async () => {
    const created = await createContact(repAToken, { firstName: 'NoReassign' })
    const contactId = created.data.id

    const res = await app.inject({
      method: 'PUT',
      url: `/api/contacts/${contactId}`,
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { ownerId: repB.id },
    })

    expect(res.statusCode).toBe(403)
  })

  it('contacts-int-manager-reassign: manager can reassign contact owner', async () => {
    const created = await createContact(repAToken, { firstName: 'ForReassign' })
    const contactId = created.data.id

    const res = await app.inject({
      method: 'PUT',
      url: `/api/contacts/${contactId}`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { ownerId: repB.id },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.ownerId).toBe(repB.id)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/contacts/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/contacts/:id', () => {
  it('contacts-int-10: admin soft-deletes; contact not in list', async () => {
    const created = await createContact(adminToken, { firstName: 'WillBeDeleted' })
    const contactId = created.data.id

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/contacts/${contactId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(delRes.statusCode).toBe(204)

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/contacts',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const body = JSON.parse(listRes.body)
    const ids = body.data.map((c: { id: string }) => c.id)
    expect(ids).not.toContain(contactId)
  })

  it('contacts-int-11: record still exists in DB with deleted_at set after soft delete', async () => {
    const { testDb } = await import('../../../test/helpers')
    const { contacts: contactsTable } = await import('../../../db/schema/contacts')
    const { and, eq, isNotNull } = await import('drizzle-orm')

    const created = await createContact(adminToken, { firstName: 'SoftDeleteCheck' })
    const contactId = created.data.id

    await app.inject({
      method: 'DELETE',
      url: `/api/contacts/${contactId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const rows = await testDb
      .select()
      .from(contactsTable)
      .where(and(eq(contactsTable.id, contactId), isNotNull(contactsTable.deletedAt)))

    expect(rows).toHaveLength(1)
    expect(rows[0].deletedAt).not.toBeNull()
  })

  it('contacts-int-12: returns 403 for manager delete attempt', async () => {
    const created = await createContact(repAToken, { firstName: 'ManagerCannotDelete' })
    const contactId = created.data.id

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/contacts/${contactId}`,
      headers: { authorization: `Bearer ${managerToken}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('contacts-int-12b: returns 403 for sales rep delete attempt', async () => {
    const created = await createContact(repAToken, { firstName: 'RepCannotDelete' })
    const contactId = created.data.id

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/contacts/${contactId}`,
      headers: { authorization: `Bearer ${repAToken}` },
    })

    expect(res.statusCode).toBe(403)
  })
})
