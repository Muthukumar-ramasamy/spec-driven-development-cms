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
let orgBAdminToken: string

beforeAll(async () => {
  await app.ready()

  orgAId = await seedOrganization()
  orgBId = await seedOrganization()

  adminUser = await seedUser(orgAId, 'admin')
  managerUser = await seedUser(orgAId, 'manager')
  repA = await seedUser(orgAId, 'sales_rep')
  repB = await seedUser(orgAId, 'sales_rep')
  const orgBAdmin = await seedUser(orgBId, 'admin')

  adminToken = createTestToken(adminUser)
  managerToken = createTestToken(managerUser)
  repAToken = createTestToken(repA)
  repBToken = createTestToken(repB)
  orgBAdminToken = createTestToken(orgBAdmin)
})

afterAll(async () => {
  await cleanupOrg(orgAId)
  await cleanupOrg(orgBId)
  await app.close()
})

// Helper: create a company via the API
async function createCompany(
  token: string,
  body: Record<string, unknown> = { name: `Test Co ${Date.now()}` },
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/companies',
    headers: { authorization: `Bearer ${token}` },
    payload: body,
  })
  return JSON.parse(res.body)
}

// ─────────────────────────────────────────────────────────────
// GET /api/companies
// ─────────────────────────────────────────────────────────────
describe('GET /api/companies', () => {
  it('companies-int-01: returns paginated list for authenticated user', async () => {
    await createCompany(repAToken, { name: `PaginationTest-${Date.now()}` })

    const res = await app.inject({
      method: 'GET',
      url: '/api/companies',
      headers: { authorization: `Bearer ${repAToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data).toBeInstanceOf(Array)
    expect(body.pagination).toMatchObject({ page: 1, limit: 20 })
  })

  it('companies-int-03: org isolation — org B cannot see org A companies', async () => {
    await createCompany(adminToken, { name: `OrgASecret-${Date.now()}` })

    const res = await app.inject({
      method: 'GET',
      url: '/api/companies',
      headers: { authorization: `Bearer ${orgBAdminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const names: string[] = body.data.map((c: { name: string }) => c.name)
    expect(names.some((n) => n.startsWith('OrgASecret'))).toBe(false)
  })

  it('companies-int-all-roles: all roles (including sales rep) see all org companies', async () => {
    const uniqueName = `AllRolesTest-${Date.now()}`
    await createCompany(adminToken, { name: uniqueName })

    // Rep A should see the company even though they didn't create it
    const res = await app.inject({
      method: 'GET',
      url: '/api/companies',
      headers: { authorization: `Bearer ${repAToken}` },
    })

    const body = JSON.parse(res.body)
    expect(body.data.some((c: { name: string }) => c.name === uniqueName)).toBe(true)
  })

  it('companies-int-search: search by partial name returns matching companies', async () => {
    await createCompany(adminToken, { name: `Zephyrine Industries ${Date.now()}` })

    const res = await app.inject({
      method: 'GET',
      url: '/api/companies?search=Zephyrine',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const body = JSON.parse(res.body)
    expect(body.data.some((c: { name: string }) => c.name.includes('Zephyrine'))).toBe(true)
  })

  it('companies-int-soft-delete-excluded: soft-deleted companies not returned', async () => {
    const created = await createCompany(adminToken, { name: `WillBeDeleted-${Date.now()}` })
    const companyId = created.data.id

    await app.inject({
      method: 'DELETE',
      url: `/api/companies/${companyId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/companies',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const body = JSON.parse(res.body)
    const ids = body.data.map((c: { id: string }) => c.id)
    expect(ids).not.toContain(companyId)
  })

  it('companies-int-unauth: returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/companies' })
    expect(res.statusCode).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/companies
// ─────────────────────────────────────────────────────────────
describe('POST /api/companies', () => {
  it('companies-int-01b: returns 201 for valid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/companies',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { name: `NewCo-${Date.now()}` },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.data.organizationId).toBe(orgAId)
    expect(body.data.ownerId).toBe(repA.id)
  })

  it('companies-int-02: returns 409 for duplicate name in org (BR-01)', async () => {
    const name = `DupTest-${Date.now()}`
    await createCompany(adminToken, { name })

    const res = await app.inject({
      method: 'POST',
      url: '/api/companies',
      headers: { authorization: `Bearer ${repBToken}` },
      payload: { name },
    })

    expect(res.statusCode).toBe(409)
    const body = JSON.parse(res.body)
    expect(body.message).toMatch(/name already exists/i)
  })

  it('companies-int-no-name: returns 400 for missing name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/companies',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { website: 'https://example.com' },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/companies/:id
// ─────────────────────────────────────────────────────────────
describe('GET /api/companies/:id', () => {
  it('companies-int-get-detail: returns company detail with contacts and deals arrays', async () => {
    const created = await createCompany(repAToken, { name: `DetailTest-${Date.now()}` })
    const companyId = created.data.id

    const res = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}`,
      headers: { authorization: `Bearer ${repAToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.id).toBe(companyId)
    expect(body.data.contacts).toBeInstanceOf(Array)
    expect(body.data.deals).toBeInstanceOf(Array)
  })

  it('companies-int-get-404: returns 404 for non-existent company', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/companies/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('companies-int-get-org-isolation: org B cannot view org A company', async () => {
    const created = await createCompany(adminToken, { name: `CrossOrgCompany-${Date.now()}` })
    const companyId = created.data.id

    const res = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}`,
      headers: { authorization: `Bearer ${orgBAdminToken}` },
    })
    expect([403, 404]).toContain(res.statusCode)
  })
})

// ─────────────────────────────────────────────────────────────
// PUT /api/companies/:id
// ─────────────────────────────────────────────────────────────
describe('PUT /api/companies/:id', () => {
  it('companies-int-update-owner: owner can update their company', async () => {
    const created = await createCompany(repAToken, { name: `UpdateMe-${Date.now()}` })
    const companyId = created.data.id

    const res = await app.inject({
      method: 'PUT',
      url: `/api/companies/${companyId}`,
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { industry: 'Technology' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.industry).toBe('Technology')
  })

  it('companies-int-06: returns 403 when sales rep edits another rep company (BR-03)', async () => {
    const created = await createCompany(repAToken, { name: `RepAOwned-${Date.now()}` })
    const companyId = created.data.id

    const res = await app.inject({
      method: 'PUT',
      url: `/api/companies/${companyId}`,
      headers: { authorization: `Bearer ${repBToken}` },
      payload: { name: 'Hacked' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('companies-int-manager-any: manager can edit any company in the org', async () => {
    const created = await createCompany(repAToken, { name: `ManagerEdit-${Date.now()}` })
    const companyId = created.data.id

    const res = await app.inject({
      method: 'PUT',
      url: `/api/companies/${companyId}`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { industry: 'Finance' },
    })
    expect(res.statusCode).toBe(200)
  })

  it('companies-int-no-reassign-rep: sales rep cannot reassign owner', async () => {
    const created = await createCompany(repAToken, { name: `NoReassign-${Date.now()}` })
    const companyId = created.data.id

    const res = await app.inject({
      method: 'PUT',
      url: `/api/companies/${companyId}`,
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { ownerId: repB.id },
    })
    expect(res.statusCode).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/companies/:id
// ─────────────────────────────────────────────────────────────
describe('DELETE /api/companies/:id', () => {
  it('companies-int-04: admin soft-deletes; company not in list', async () => {
    const created = await createCompany(adminToken, { name: `ToSoftDelete-${Date.now()}` })
    const companyId = created.data.id

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/companies/${companyId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(delRes.statusCode).toBe(204)

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/companies',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const body = JSON.parse(listRes.body)
    const ids = body.data.map((c: { id: string }) => c.id)
    expect(ids).not.toContain(companyId)
  })

  it('companies-int-deleted-in-db: record still in DB with deleted_at set (BR-02)', async () => {
    const { testDb } = await import('../../../test/helpers')
    const { companies: companiesTable } = await import('../../../db/schema/companies')
    const { and, eq, isNotNull } = await import('drizzle-orm')

    const created = await createCompany(adminToken, { name: `SoftDeleteCheck-${Date.now()}` })
    const companyId = created.data.id

    await app.inject({
      method: 'DELETE',
      url: `/api/companies/${companyId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const rows = await testDb
      .select()
      .from(companiesTable)
      .where(and(eq(companiesTable.id, companyId), isNotNull(companiesTable.deletedAt)))

    expect(rows).toHaveLength(1)
    expect(rows[0].deletedAt).not.toBeNull()
  })

  it('companies-int-contacts-unlinked: contacts have company_id = null after delete (BR-02)', async () => {
    const { testDb } = await import('../../../test/helpers')
    const { contacts: contactsTable } = await import('../../../db/schema/contacts')
    const { and, eq, isNull } = await import('drizzle-orm')

    const company = await createCompany(adminToken, { name: `UnlinkTest-${Date.now()}` })
    const companyId = company.data.id

    // Create a contact linked to this company
    const contactRes = await app.inject({
      method: 'POST',
      url: '/api/contacts',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { firstName: 'LinkedContact', companyId },
    })
    const contactId = JSON.parse(contactRes.body).data.id

    // Soft-delete the company
    await app.inject({
      method: 'DELETE',
      url: `/api/companies/${companyId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    // Verify contact company_id is now null
    const rows = await testDb
      .select()
      .from(contactsTable)
      .where(and(eq(contactsTable.id, contactId), isNull(contactsTable.companyId)))

    expect(rows).toHaveLength(1)
    expect(rows[0].companyId).toBeNull()
  })

  it('companies-int-05: returns 403 for manager delete attempt', async () => {
    const created = await createCompany(adminToken, { name: `ManagerCannotDel-${Date.now()}` })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/companies/${created.data.id}`,
      headers: { authorization: `Bearer ${managerToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('companies-int-05b: returns 403 for sales rep delete attempt', async () => {
    const created = await createCompany(repAToken, { name: `RepCannotDel-${Date.now()}` })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/companies/${created.data.id}`,
      headers: { authorization: `Bearer ${repAToken}` },
    })
    expect(res.statusCode).toBe(403)
  })
})
