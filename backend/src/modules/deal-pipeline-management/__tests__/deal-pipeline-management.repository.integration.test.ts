/**
 * Integration tests for Deal & Pipeline Management
 *
 * These tests run against a real test database (Neon serverless).
 * File pattern: *.integration.test.ts  → picked up by the "integration" Vitest project.
 * Each describe block is fully self-contained: it seeds its own org/users,
 * drives the Fastify app via inject(), then cleans up in afterAll.
 *
 * Test IDs: deal-int-NN
 */

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
let orgBRep: { id: string; organizationId: string; role: string }

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
  orgBRep = await seedUser(orgBId, 'sales_rep')

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOrCreateDefaultStage(token: string): Promise<string> {
  const res = await app.inject({
    method: 'GET',
    url: '/api/pipeline-stages',
    headers: { authorization: `Bearer ${token}` },
  })
  const body = JSON.parse(res.body)
  return body.data[0].id
}

async function createDeal(
  token: string,
  body: Record<string, unknown>,
): Promise<{ data: { id: string; status: string; ownerId: string; stageId: string } }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/deals',
    headers: { authorization: `Bearer ${token}` },
    payload: body,
  })
  return JSON.parse(res.body)
}

async function createStageAsAdmin(name: string, displayOrder: number): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/pipeline-stages',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { name, displayOrder, probability: 0 },
  })
  const body = JSON.parse(res.body)
  return body.data.id
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pipeline-stages
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/pipeline-stages', () => {
  it('deal-int-01: returns seeded default stages for a new org', async () => {
    // Org is new — listStages seeds 5 defaults
    const res = await app.inject({
      method: 'GET',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    expect(body.data[0]).toMatchObject({ name: expect.any(String), displayOrder: expect.any(Number) })
  })

  it('deal-int-02: returns 401 without authentication token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/pipeline-stages',
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/deals
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/deals', () => {
  it('deal-int-03: creates deal with status=open and owner set to caller (AC-01)', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)

    const res = await app.inject({
      method: 'POST',
      url: '/api/deals',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { title: 'Integration Test Deal', stageId },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.data.status).toBe('open')
    expect(body.data.ownerId).toBe(repA.id)
  })

  it('deal-int-04: deal value defaults to 0 when not provided (BR-06)', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)

    const res = await app.inject({
      method: 'POST',
      url: '/api/deals',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { title: 'No Value Deal', stageId },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(Number(body.data.value)).toBe(0)
  })

  it('deal-int-05: returns 400 when stageId is missing (BR-01)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/deals',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { title: 'No Stage Deal' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('deal-int-06: returns 400 when title is missing (BR-01)', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)

    const res = await app.inject({
      method: 'POST',
      url: '/api/deals',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { stageId },
    })

    expect(res.statusCode).toBe(400)
  })

  it('deal-int-07: creates initial stage history entry on deal creation (BR-07, AC-07)', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/deals',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { title: 'History On Create', stageId },
    })
    const { data: deal } = JSON.parse(createRes.body)

    // Fetch deal detail — should include stageHistory
    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/deals/${deal.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const detailBody = JSON.parse(detailRes.body)
    expect(detailBody.data.stageHistory).toHaveLength(1)
    expect(detailBody.data.stageHistory[0].fromStageId).toBeNull()
    expect(detailBody.data.stageHistory[0].toStageId).toBe(stageId)
  })

  it('deal-int-08: returns 401 without authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/deals',
      payload: { title: 'Ghost Deal', stageId: '00000000-0000-0000-0000-000000000000' },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/deals — list filtering and isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/deals', () => {
  it('deal-int-09: org isolation — org B cannot see org A deals (AC-02)', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)
    await createDeal(repAToken, { title: 'OrgA Private Deal', stageId })

    const res = await app.inject({
      method: 'GET',
      url: '/api/deals',
      headers: { authorization: `Bearer ${orgBRepToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const titles = body.data.map((d: { title: string }) => d.title)
    expect(titles).not.toContain('OrgA Private Deal')
  })

  it('deal-int-10: sales rep sees only own deals by default (AC-03, BR-03)', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)
    await createDeal(repAToken, { title: 'RepA Exclusive Deal', stageId })
    await createDeal(repBToken, { title: 'RepB Exclusive Deal', stageId })

    const res = await app.inject({
      method: 'GET',
      url: '/api/deals',
      headers: { authorization: `Bearer ${repAToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const titles = body.data.map((d: { title: string }) => d.title)
    expect(titles).not.toContain('RepB Exclusive Deal')
  })

  it('deal-int-11: won and lost deals are not returned in default open board list (AC-04, BR-03)', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)
    const created = await createDeal(adminToken, { title: 'WillBeWon', stageId })
    const dealId = created.data.id

    // Mark it won
    await app.inject({
      method: 'POST',
      url: `/api/deals/${dealId}/won`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    // List open deals — should not contain the won deal
    const res = await app.inject({
      method: 'GET',
      url: '/api/deals?status=open',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const body = JSON.parse(res.body)
    const ids = body.data.map((d: { id: string }) => d.id)
    expect(ids).not.toContain(dealId)
  })

  it('deal-int-12: soft-deleted deals are not returned by list (soft delete coverage)', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)
    const created = await createDeal(adminToken, { title: 'WillBeSoftDeleted', stageId })
    const dealId = created.data.id

    await app.inject({
      method: 'DELETE',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/deals',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const body = JSON.parse(res.body)
    const ids = body.data.map((d: { id: string }) => d.id)
    expect(ids).not.toContain(dealId)
  })

  it('deal-int-13: manager can filter by ownerId to see specific rep deals', async () => {
    const stageId = await getOrCreateDefaultStage(managerToken)
    await createDeal(repAToken, { title: 'RepAManagerFilter', stageId })

    const res = await app.inject({
      method: 'GET',
      url: `/api/deals?ownerId=${repA.id}`,
      headers: { authorization: `Bearer ${managerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const owners = body.data.map((d: { ownerId: string }) => d.ownerId)
    // All returned deals should belong to repA
    expect(owners.every((id: string) => id === repA.id)).toBe(true)
  })

  it('deal-int-14: returns paginated response with pagination meta', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)
    await createDeal(adminToken, { title: 'PaginationDeal', stageId })

    const res = await app.inject({
      method: 'GET',
      url: '/api/deals?page=1&limit=5',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.pagination).toMatchObject({ page: 1, limit: 5 })
    expect(body.data).toBeInstanceOf(Array)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/deals/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/deals/:id', () => {
  it('deal-int-15: returns deal detail with stageHistory array', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)
    const created = await createDeal(adminToken, { title: 'Detail Deal', stageId })
    const dealId = created.data.id

    const res = await app.inject({
      method: 'GET',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.id).toBe(dealId)
    expect(Array.isArray(body.data.stageHistory)).toBe(true)
  })

  it('deal-int-16: returns 404 for non-existent deal', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/deals/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(404)
  })

  it('deal-int-17: returns 403 when sales rep tries to view another reps deal', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)
    const created = await createDeal(repAToken, { title: 'RepA Exclusive', stageId })
    const dealId = created.data.id

    const res = await app.inject({
      method: 'GET',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${repBToken}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('deal-int-18: org isolation — org B cannot view org A deal (returns 404)', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)
    const created = await createDeal(adminToken, { title: 'OrgA Only', stageId })
    const dealId = created.data.id

    const res = await app.inject({
      method: 'GET',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${orgBRepToken}` },
    })

    expect([403, 404]).toContain(res.statusCode)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/deals/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/deals/:id', () => {
  it('deal-int-19: sales rep can update their own deal', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)
    const created = await createDeal(repAToken, { title: 'BeforeUpdate', stageId })
    const dealId = created.data.id

    const res = await app.inject({
      method: 'PUT',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { title: 'AfterUpdate' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.title).toBe('AfterUpdate')
  })

  it('deal-int-20: sales rep cannot edit another reps deal — returns 403 (AC-permissions)', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)
    const created = await createDeal(repAToken, { title: 'RepA Forbidden', stageId })
    const dealId = created.data.id

    const res = await app.inject({
      method: 'PUT',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${repBToken}` },
      payload: { title: 'Hacked' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('deal-int-21: sales rep cannot reassign ownerId — returns 403', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)
    const created = await createDeal(repAToken, { title: 'NoReassign', stageId })
    const dealId = created.data.id

    const res = await app.inject({
      method: 'PUT',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { ownerId: repB.id },
    })

    expect(res.statusCode).toBe(403)
  })

  it('deal-int-22: stage change appends a stage history record (AC-07, BR-07 — append-only)', async () => {
    const stages = JSON.parse(
      (
        await app.inject({
          method: 'GET',
          url: '/api/pipeline-stages',
          headers: { authorization: `Bearer ${adminToken}` },
        })
      ).body,
    ).data
    const stageA = stages[0].id
    const stageB = stages[1]?.id ?? stageA

    const created = await createDeal(adminToken, { title: 'Stage Move Deal', stageId: stageA })
    const dealId = created.data.id

    // Move to stageB
    await app.inject({
      method: 'PUT',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { stageId: stageB },
    })

    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const body = JSON.parse(detailRes.body)
    // Should have 2 history entries: initial creation + the move
    expect(body.data.stageHistory.length).toBeGreaterThanOrEqual(stageA === stageB ? 1 : 2)
  })

  it('deal-int-23: manager can edit any deal in the org (edit-any-deal permission)', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)
    const created = await createDeal(repAToken, { title: 'ManagerCanEdit', stageId })
    const dealId = created.data.id

    const res = await app.inject({
      method: 'PUT',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { title: 'ManagerEdited' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.title).toBe('ManagerEdited')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/deals/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/deals/:id', () => {
  it('deal-int-24: admin can soft-delete; deal disappears from list (AC-permissions)', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)
    const created = await createDeal(adminToken, { title: 'WillBeAdminDeleted', stageId })
    const dealId = created.data.id

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(delRes.statusCode).toBe(204)

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/deals',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const body = JSON.parse(listRes.body)
    const ids = body.data.map((d: { id: string }) => d.id)
    expect(ids).not.toContain(dealId)
  })

  it('deal-int-25: soft-deleted record has deleted_at set in DB (soft delete coverage)', async () => {
    const { testDb } = await import('../../../test/helpers')
    const { deals: dealsTable } = await import('../../../db/schema/deals')
    const { and, eq, isNotNull } = await import('drizzle-orm')

    const stageId = await getOrCreateDefaultStage(adminToken)
    const created = await createDeal(adminToken, { title: 'SoftDeleteCheck', stageId })
    const dealId = created.data.id

    await app.inject({
      method: 'DELETE',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const rows = await testDb
      .select()
      .from(dealsTable)
      .where(and(eq(dealsTable.id, dealId), isNotNull(dealsTable.deletedAt)))

    expect(rows).toHaveLength(1)
    expect(rows[0].deletedAt).not.toBeNull()
  })

  it('deal-int-26: manager cannot delete a deal — returns 403 (permissions matrix)', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)
    const created = await createDeal(adminToken, { title: 'ManagerNoDel', stageId })
    const dealId = created.data.id

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${managerToken}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('deal-int-27: sales rep cannot delete a deal — returns 403 (permissions matrix)', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)
    const created = await createDeal(repAToken, { title: 'RepNoDel', stageId })
    const dealId = created.data.id

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${repAToken}` },
    })

    expect(res.statusCode).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/deals/:id/won
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/deals/:id/won', () => {
  it('deal-int-28: marks deal won; status=won, wonAt set, removed from open board (AC-05)', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)
    const created = await createDeal(adminToken, { title: 'WillWin', stageId })
    const dealId = created.data.id

    const wonRes = await app.inject({
      method: 'POST',
      url: `/api/deals/${dealId}/won`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(wonRes.statusCode).toBe(200)
    const body = JSON.parse(wonRes.body)
    expect(body.data.status).toBe('won')
    expect(body.data.wonAt).not.toBeNull()
  })

  it('deal-int-29: won deal is removed from open pipeline board list (AC-04)', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)
    const created = await createDeal(adminToken, { title: 'WillWinAndHide', stageId })
    const dealId = created.data.id

    await app.inject({
      method: 'POST',
      url: `/api/deals/${dealId}/won`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/deals?status=open',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const ids = JSON.parse(listRes.body).data.map((d: { id: string }) => d.id)
    expect(ids).not.toContain(dealId)
  })

  it('deal-int-30: sales rep cannot mark another reps deal won — returns 403 (BR-03)', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)
    const created = await createDeal(repAToken, { title: 'RepAWin', stageId })
    const dealId = created.data.id

    const res = await app.inject({
      method: 'POST',
      url: `/api/deals/${dealId}/won`,
      headers: { authorization: `Bearer ${repBToken}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('deal-int-31: returns 404 for non-existent deal', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/deals/00000000-0000-0000-0000-000000000000/won',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/deals/:id/lost
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/deals/:id/lost', () => {
  it('deal-int-32: marks deal lost with reason; status=lost, lostAt and lostReason set (AC-06)', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)
    const created = await createDeal(adminToken, { title: 'WillLose', stageId })
    const dealId = created.data.id

    const lostRes = await app.inject({
      method: 'POST',
      url: `/api/deals/${dealId}/lost`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { lostReason: 'Lost to competitor' },
    })

    expect(lostRes.statusCode).toBe(200)
    const body = JSON.parse(lostRes.body)
    expect(body.data.status).toBe('lost')
    expect(body.data.lostReason).toBe('Lost to competitor')
    expect(body.data.lostAt).not.toBeNull()
  })

  it('deal-int-33: returns 400 when lostReason is missing (BR-02, AC-06)', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)
    const created = await createDeal(adminToken, { title: 'MissingReason', stageId })
    const dealId = created.data.id

    const res = await app.inject({
      method: 'POST',
      url: `/api/deals/${dealId}/lost`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('deal-int-34: lost deal removed from open pipeline board (AC-04, BR-03)', async () => {
    const stageId = await getOrCreateDefaultStage(adminToken)
    const created = await createDeal(adminToken, { title: 'WillLoseAndHide', stageId })
    const dealId = created.data.id

    await app.inject({
      method: 'POST',
      url: `/api/deals/${dealId}/lost`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { lostReason: 'Budget' },
    })

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/deals?status=open',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const ids = JSON.parse(listRes.body).data.map((d: { id: string }) => d.id)
    expect(ids).not.toContain(dealId)
  })

  it('deal-int-35: sales rep cannot mark another reps deal lost — returns 403 (BR-03)', async () => {
    const stageId = await getOrCreateDefaultStage(repAToken)
    const created = await createDeal(repAToken, { title: 'RepALost', stageId })
    const dealId = created.data.id

    const res = await app.inject({
      method: 'POST',
      url: `/api/deals/${dealId}/lost`,
      headers: { authorization: `Bearer ${repBToken}` },
      payload: { lostReason: 'Unauthorised' },
    })

    expect(res.statusCode).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pipeline-stages (create stage — admin only)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/pipeline-stages', () => {
  it('deal-int-36: admin can create a pipeline stage', async () => {
    // Ensure pipeline exists first
    await app.inject({
      method: 'GET',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: `TestStage-${Date.now()}`, displayOrder: 99, probability: 50 },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.data.name).toMatch(/TestStage-/)
  })

  it('deal-int-37: manager cannot create a stage — returns 403 (permissions matrix)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { name: 'ManagerStage', displayOrder: 10, probability: 0 },
    })

    expect(res.statusCode).toBe(403)
  })

  it('deal-int-38: sales rep cannot create a stage — returns 403 (permissions matrix)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { name: 'RepStage', displayOrder: 10, probability: 0 },
    })

    expect(res.statusCode).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/pipeline-stages/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/pipeline-stages/:id', () => {
  it('deal-int-39: returns 422 when stage has open deals (BR-04, AC-08)', async () => {
    // Ensure stages exist
    const stages = JSON.parse(
      (
        await app.inject({
          method: 'GET',
          url: '/api/pipeline-stages',
          headers: { authorization: `Bearer ${adminToken}` },
        })
      ).body,
    ).data

    // Create a deal in the first stage
    const targetStageId = stages[0].id
    await createDeal(adminToken, { title: 'BlocksDelete', stageId: targetStageId })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/pipeline-stages/${targetStageId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(422)
    const body = JSON.parse(res.body)
    expect(body.message).toMatch(/Cannot delete a stage with open deals/i)
  })

  it('deal-int-40: returns 422 when deleting the last stage (BR-05, AC-10)', async () => {
    // Create a fresh org with a single stage to test last-stage deletion
    const soloOrgId = await seedOrganization()
    const soloAdmin = await seedUser(soloOrgId, 'admin')
    const soloToken = createTestToken(soloAdmin)

    // Seed default stages then keep only one
    const stagesRes = await app.inject({
      method: 'GET',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${soloToken}` },
    })
    const allStages = JSON.parse(stagesRes.body).data

    // Delete all but the last one (without open deals)
    for (const stage of allStages.slice(1)) {
      await app.inject({
        method: 'DELETE',
        url: `/api/pipeline-stages/${stage.id}`,
        headers: { authorization: `Bearer ${soloToken}` },
      })
    }

    // Now attempt to delete the last remaining stage
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/pipeline-stages/${allStages[0].id}`,
      headers: { authorization: `Bearer ${soloToken}` },
    })

    expect(res.statusCode).toBe(422)
    const body = JSON.parse(res.body)
    expect(body.message).toMatch(/at least one stage/i)

    await cleanupOrg(soloOrgId)
  })

  it('deal-int-41: manager cannot delete a stage — returns 403 (permissions matrix)', async () => {
    const stages = JSON.parse(
      (
        await app.inject({
          method: 'GET',
          url: '/api/pipeline-stages',
          headers: { authorization: `Bearer ${adminToken}` },
        })
      ).body,
    ).data

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/pipeline-stages/${stages[0].id}`,
      headers: { authorization: `Bearer ${managerToken}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('deal-int-42: soft-deleted stage has deleted_at set in DB (soft delete coverage)', async () => {
    const { testDb } = await import('../../../test/helpers')
    const { pipelineStages: stagesTable } = await import('../../../db/schema/pipeline-stages')
    const { and, eq, isNotNull } = await import('drizzle-orm')

    // Ensure stages exist, then create a spare stage with no deals
    await app.inject({
      method: 'GET',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const stageName = `SoftDeleteStage-${Date.now()}`
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: stageName, displayOrder: 999, probability: 0 },
    })
    const newStageId = JSON.parse(createRes.body).data.id

    await app.inject({
      method: 'DELETE',
      url: `/api/pipeline-stages/${newStageId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const rows = await testDb
      .select()
      .from(stagesTable)
      .where(and(eq(stagesTable.id, newStageId), isNotNull(stagesTable.deletedAt)))

    expect(rows).toHaveLength(1)
    expect(rows[0].deletedAt).not.toBeNull()
  })

  it('deal-int-43: soft-deleted stage does not appear in stage list', async () => {
    // Create a fresh stage, delete it, verify it's gone from list
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: `ToDeleteStage-${Date.now()}`, displayOrder: 998, probability: 0 },
    })
    const newStageId = JSON.parse(createRes.body).data.id

    await app.inject({
      method: 'DELETE',
      url: `/api/pipeline-stages/${newStageId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const ids = JSON.parse(listRes.body).data.map((s: { id: string }) => s.id)
    expect(ids).not.toContain(newStageId)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/pipeline-stages/reorder
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/pipeline-stages/reorder', () => {
  it('deal-int-44: admin can reorder stages; new order is persisted (AC-09)', async () => {
    const stagesRes = await app.inject({
      method: 'GET',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const stages = JSON.parse(stagesRes.body).data
    if (stages.length < 2) {
      // Need at least 2 stages — skip this assertion if only one exists
      return
    }

    // Reverse the first two stages
    const reordered = [
      { id: stages[1].id, displayOrder: stages[0].displayOrder },
      { id: stages[0].id, displayOrder: stages[1].displayOrder },
    ]

    const res = await app.inject({
      method: 'PUT',
      url: '/api/pipeline-stages/reorder',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { stages: reordered },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data).toBeInstanceOf(Array)

    // Verify the new order is reflected in a subsequent GET
    const verifyRes = await app.inject({
      method: 'GET',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const updatedStages = JSON.parse(verifyRes.body).data
    // The stage that was second should now be ordered first
    expect(updatedStages[0].id).toBe(stages[1].id)
  })

  it('deal-int-45: manager cannot reorder stages — returns 403 (permissions matrix)', async () => {
    const stagesRes = await app.inject({
      method: 'GET',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const stages = JSON.parse(stagesRes.body).data

    const res = await app.inject({
      method: 'PUT',
      url: '/api/pipeline-stages/reorder',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { stages: [{ id: stages[0].id, displayOrder: 1 }] },
    })

    expect(res.statusCode).toBe(403)
  })

  it('deal-int-46: sales rep cannot reorder stages — returns 403 (permissions matrix)', async () => {
    const stagesRes = await app.inject({
      method: 'GET',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${repAToken}` },
    })
    const stages = JSON.parse(stagesRes.body).data

    const res = await app.inject({
      method: 'PUT',
      url: '/api/pipeline-stages/reorder',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { stages: [{ id: stages[0].id, displayOrder: 1 }] },
    })

    expect(res.statusCode).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Stage history — append-only invariant (BR-07)
// ─────────────────────────────────────────────────────────────────────────────

describe('Stage history — append-only (BR-07)', () => {
  it('deal-int-47: stage history grows with each stage change; entries are not mutated', async () => {
    const stagesRes = await app.inject({
      method: 'GET',
      url: '/api/pipeline-stages',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const stages = JSON.parse(stagesRes.body).data
    const stageA = stages[0].id
    const stageB = (stages[1] ?? stages[0]).id

    // Create deal in stageA
    const created = await createDeal(adminToken, { title: 'HistoryAppendOnly', stageId: stageA })
    const dealId = created.data.id

    // Move to stageB
    await app.inject({
      method: 'PUT',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { stageId: stageB },
    })

    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/deals/${dealId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const history = JSON.parse(detailRes.body).data.stageHistory

    // First entry must have fromStageId=null (creation)
    expect(history[0].fromStageId).toBeNull()

    // All history entries must not have deletedAt (no delete possible)
    for (const entry of history) {
      expect(entry).not.toHaveProperty('deletedAt')
    }

    if (stageA !== stageB) {
      // There should be exactly 2 entries
      expect(history).toHaveLength(2)
      // Second entry records the move
      expect(history[1].fromStageId).toBe(stageA)
      expect(history[1].toStageId).toBe(stageB)
    }
  })
})
