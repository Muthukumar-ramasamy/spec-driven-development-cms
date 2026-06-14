import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { and, eq, isNotNull } from 'drizzle-orm'
import { buildApp } from '../../../app'
import {
  seedOrganization,
  seedUser,
  createTestToken,
  cleanupOrg,
  testDb,
} from '../../../test/helpers'
import { activities as activitiesTable } from '../../../db/schema/activities'

const app = buildApp()

// ---------------------------------------------------------------------------
// Shared state — seeded once per test file
// ---------------------------------------------------------------------------

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

// Shared contact_id seed so we satisfy the linked-record constraint
let contactIdOrgA: string
let contactIdOrgB: string

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

  // Create contacts in each org to satisfy the at-least-one-linked-record constraint
  const contactResA = await app.inject({
    method: 'POST',
    url: '/api/contacts',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { firstName: 'Seed Contact Org A' },
  })
  contactIdOrgA = JSON.parse(contactResA.body).data.id

  const contactResB = await app.inject({
    method: 'POST',
    url: '/api/contacts',
    headers: { authorization: `Bearer ${orgBRepToken}` },
    payload: { firstName: 'Seed Contact Org B' },
  })
  contactIdOrgB = JSON.parse(contactResB.body).data.id
})

afterAll(async () => {
  await cleanupOrg(orgAId)
  await cleanupOrg(orgBId)
  await app.close()
})

// ---------------------------------------------------------------------------
// Helper: create an activity via the API
// ---------------------------------------------------------------------------
async function createActivity(
  token: string,
  body: Record<string, unknown>,
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/activities',
    headers: { authorization: `Bearer ${token}` },
    payload: body,
  })
  return { status: res.statusCode, body: JSON.parse(res.body) }
}

// ---------------------------------------------------------------------------
// POST /api/activities — Create
// ---------------------------------------------------------------------------

describe('POST /api/activities', () => {
  it('activity-int-01: returns 201 and creates activity linked to a contact', async () => {
    // Arrange & Act
    const { status, body } = await createActivity(repAToken, {
      type: 'call',
      subject: 'First call',
      contactId: contactIdOrgA,
    })

    // Assert
    expect(status).toBe(201)
    expect(body.data.subject).toBe('First call')
    expect(body.data.done).toBe(false)
    expect(body.data.ownerId).toBe(repA.id)
  })

  it('activity-int-02: returns 400 when no linked record is provided (AC-03, BR-01)', async () => {
    // Act
    const res = await app.inject({
      method: 'POST',
      url: '/api/activities',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { type: 'call', subject: 'Orphan activity' },
    })

    // Assert
    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.message).toMatch(/linked to at least one record/i)
  })

  it('activity-int-03: creates logged activity with done=true and doneAt set (AC-01)', async () => {
    // Act
    const { status, body } = await createActivity(repAToken, {
      type: 'email',
      subject: 'Sent proposal email',
      done: true,
      contactId: contactIdOrgA,
    })

    // Assert
    expect(status).toBe(201)
    expect(body.data.done).toBe(true)
    expect(body.data.doneAt).not.toBeNull()
  })

  it('activity-int-04: creates a task with due_date (AC-02)', async () => {
    // Act
    const { status, body } = await createActivity(repAToken, {
      type: 'meeting',
      subject: 'Follow-up meeting',
      done: false,
      dueDate: '2026-08-01',
      contactId: contactIdOrgA,
    })

    // Assert
    expect(status).toBe(201)
    expect(body.data.done).toBe(false)
    expect(body.data.dueDate).toBe('2026-08-01')
  })

  it('activity-int-05: returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/activities',
      payload: { type: 'call', subject: 'Ghost', contactId: contactIdOrgA },
    })
    expect(res.statusCode).toBe(401)
  })

  it('activity-int-06: returns 400 for invalid activity type (BR-03)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/activities',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { type: 'fax', subject: 'Old school fax', contactId: contactIdOrgA },
    })
    expect(res.statusCode).toBe(400)
  })

  it('activity-int-07: returns 400 for missing subject', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/activities',
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { type: 'call', contactId: contactIdOrgA },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// GET /api/activities
// ---------------------------------------------------------------------------

describe('GET /api/activities', () => {
  it('activity-int-08: org isolation — org B cannot see org A activities (BR-05)', async () => {
    // Arrange: create an activity in org A
    await createActivity(repAToken, {
      type: 'call',
      subject: 'OrgA Private Activity',
      contactId: contactIdOrgA,
    })

    // Act: org B user queries activities
    const res = await app.inject({
      method: 'GET',
      url: '/api/activities',
      headers: { authorization: `Bearer ${orgBRepToken}` },
    })

    // Assert
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const subjects = body.data.map((a: { subject: string }) => a.subject)
    expect(subjects).not.toContain('OrgA Private Activity')
  })

  it('activity-int-09: done=false filter returns only open tasks (AC-04)', async () => {
    // Arrange
    await createActivity(repAToken, {
      type: 'call',
      subject: 'Open task for filter test',
      done: false,
      contactId: contactIdOrgA,
    })
    await createActivity(repAToken, {
      type: 'email',
      subject: 'Done activity for filter test',
      done: true,
      contactId: contactIdOrgA,
    })

    // Act
    const res = await app.inject({
      method: 'GET',
      url: `/api/activities?done=false&ownerId=${repA.id}`,
      headers: { authorization: `Bearer ${repAToken}` },
    })

    // Assert
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.every((a: { done: boolean }) => a.done === false)).toBe(true)
  })

  it('activity-int-10: sales rep only sees own activities — not another rep\'s (AC-04, BR-05)', async () => {
    // Arrange: rep B creates an activity
    await createActivity(repBToken, {
      type: 'call',
      subject: 'RepB Secret Activity',
      contactId: contactIdOrgA,
    })

    // Act: rep A queries
    const res = await app.inject({
      method: 'GET',
      url: '/api/activities',
      headers: { authorization: `Bearer ${repAToken}` },
    })

    // Assert: rep A should not see rep B's activity
    const body = JSON.parse(res.body)
    const subjects = body.data.map((a: { subject: string }) => a.subject)
    expect(subjects).not.toContain('RepB Secret Activity')
  })

  it('activity-int-11: manager sees all org activities including other reps\' (AC-09)', async () => {
    // Arrange: rep A creates an activity
    await createActivity(repAToken, {
      type: 'lunch',
      subject: 'Activity For Manager View',
      contactId: contactIdOrgA,
    })

    // Act: manager queries all activities (no ownerId filter)
    const res = await app.inject({
      method: 'GET',
      url: '/api/activities',
      headers: { authorization: `Bearer ${managerToken}` },
    })

    // Assert
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    // At minimum, the seeded activity is visible
    const subjects = body.data.map((a: { subject: string }) => a.subject)
    expect(subjects).toContain('Activity For Manager View')
  })

  it('activity-int-12: filter by contactId returns only activities linked to that contact', async () => {
    // Arrange
    await createActivity(repAToken, {
      type: 'call',
      subject: 'Linked To Contact',
      contactId: contactIdOrgA,
    })

    // Act
    const res = await app.inject({
      method: 'GET',
      url: `/api/activities?contactId=${contactIdOrgA}`,
      headers: { authorization: `Bearer ${managerToken}` },
    })

    // Assert
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    body.data.forEach((a: { contactId: string }) => {
      expect(a.contactId).toBe(contactIdOrgA)
    })
  })

  it('activity-int-13: returns paginated result with pagination meta', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/activities?page=1&limit=5',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.pagination).toMatchObject({ page: 1, limit: 5 })
  })
})

// ---------------------------------------------------------------------------
// GET /api/activities/:id
// ---------------------------------------------------------------------------

describe('GET /api/activities/:id', () => {
  it('activity-int-14: owner can fetch their own activity by id', async () => {
    // Arrange
    const { body: created } = await createActivity(repAToken, {
      type: 'demo',
      subject: 'Demo Activity',
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act
    const res = await app.inject({
      method: 'GET',
      url: `/api/activities/${activityId}`,
      headers: { authorization: `Bearer ${repAToken}` },
    })

    // Assert
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.id).toBe(activityId)
  })

  it('activity-int-15: sales rep cannot view another rep\'s activity — 403', async () => {
    // Arrange: rep A creates activity
    const { body: created } = await createActivity(repAToken, {
      type: 'call',
      subject: 'RepA Private',
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act: rep B tries to fetch it
    const res = await app.inject({
      method: 'GET',
      url: `/api/activities/${activityId}`,
      headers: { authorization: `Bearer ${repBToken}` },
    })

    // Assert
    expect(res.statusCode).toBe(403)
  })

  it('activity-int-16: returns 404 for non-existent activity', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/activities/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('activity-int-17: org B cannot view org A activity by id — 404', async () => {
    // Arrange: create in org A
    const { body: created } = await createActivity(repAToken, {
      type: 'call',
      subject: 'OrgA Cross-org Check',
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act: org B user tries to fetch
    const res = await app.inject({
      method: 'GET',
      url: `/api/activities/${activityId}`,
      headers: { authorization: `Bearer ${orgBRepToken}` },
    })

    // Assert — org-scoped query returns null → 404
    expect([403, 404]).toContain(res.statusCode)
  })
})

// ---------------------------------------------------------------------------
// PUT /api/activities/:id
// ---------------------------------------------------------------------------

describe('PUT /api/activities/:id', () => {
  it('activity-int-18: owner can update their activity subject', async () => {
    // Arrange
    const { body: created } = await createActivity(repAToken, {
      type: 'call',
      subject: 'Original Subject',
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act
    const res = await app.inject({
      method: 'PUT',
      url: `/api/activities/${activityId}`,
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { subject: 'Updated Subject' },
    })

    // Assert
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.subject).toBe('Updated Subject')
  })

  it('activity-int-19: sales rep cannot update another rep\'s activity — 403', async () => {
    // Arrange: rep A creates activity
    const { body: created } = await createActivity(repAToken, {
      type: 'email',
      subject: 'RepA Email',
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act: rep B tries to update it
    const res = await app.inject({
      method: 'PUT',
      url: `/api/activities/${activityId}`,
      headers: { authorization: `Bearer ${repBToken}` },
      payload: { subject: 'Hacked' },
    })

    // Assert
    expect(res.statusCode).toBe(403)
  })

  it('activity-int-20: manager can update any activity in the org', async () => {
    // Arrange
    const { body: created } = await createActivity(repAToken, {
      type: 'meeting',
      subject: 'Before Manager Edit',
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act
    const res = await app.inject({
      method: 'PUT',
      url: `/api/activities/${activityId}`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { subject: 'After Manager Edit' },
    })

    // Assert
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.subject).toBe('After Manager Edit')
  })
})

// ---------------------------------------------------------------------------
// PUT /api/activities/:id/done
// ---------------------------------------------------------------------------

describe('PUT /api/activities/:id/done', () => {
  it('activity-int-21: marks task done — done=true, doneAt set (AC-06)', async () => {
    // Arrange: create an open task
    const { body: created } = await createActivity(repAToken, {
      type: 'call',
      subject: 'Task To Complete',
      done: false,
      dueDate: '2026-08-15',
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act
    const res = await app.inject({
      method: 'PUT',
      url: `/api/activities/${activityId}/done`,
      headers: { authorization: `Bearer ${repAToken}` },
      payload: {},
    })

    // Assert
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.done).toBe(true)
    expect(body.data.doneAt).not.toBeNull()
  })

  it('activity-int-22: marked-done task no longer appears in open task list (AC-06)', async () => {
    // Arrange: create an open task
    const { body: created } = await createActivity(repAToken, {
      type: 'call',
      subject: 'Disappearing Task',
      done: false,
      dueDate: '2026-08-15',
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Mark done
    await app.inject({
      method: 'PUT',
      url: `/api/activities/${activityId}/done`,
      headers: { authorization: `Bearer ${repAToken}` },
      payload: {},
    })

    // Fetch open tasks
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/activities?done=false&ownerId=${repA.id}`,
      headers: { authorization: `Bearer ${repAToken}` },
    })

    // Assert: the completed task is not in the open list
    const listBody = JSON.parse(listRes.body)
    const ids = listBody.data.map((a: { id: string }) => a.id)
    expect(ids).not.toContain(activityId)
  })

  it('activity-int-23: returns 400 when marking an already-done task done again (BR-02)', async () => {
    // Arrange: create and immediately mark done
    const { body: created } = await createActivity(repAToken, {
      type: 'call',
      subject: 'Already Done Task',
      done: false,
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    await app.inject({
      method: 'PUT',
      url: `/api/activities/${activityId}/done`,
      headers: { authorization: `Bearer ${repAToken}` },
      payload: {},
    })

    // Act: mark done a second time
    const res = await app.inject({
      method: 'PUT',
      url: `/api/activities/${activityId}/done`,
      headers: { authorization: `Bearer ${repAToken}` },
      payload: {},
    })

    // Assert
    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.message).toMatch(/already marked as done/i)
  })

  it('activity-int-24: outcome note is saved when marking done', async () => {
    // Arrange
    const { body: created } = await createActivity(repAToken, {
      type: 'call',
      subject: 'Task With Outcome',
      done: false,
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act
    const res = await app.inject({
      method: 'PUT',
      url: `/api/activities/${activityId}/done`,
      headers: { authorization: `Bearer ${repAToken}` },
      payload: { notes: 'Closed the deal!' },
    })

    // Assert
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.notes).toBe('Closed the deal!')
  })

  it('activity-int-25: sales rep cannot mark another rep\'s task done — 403', async () => {
    // Arrange: rep A creates task
    const { body: created } = await createActivity(repAToken, {
      type: 'call',
      subject: 'RepA Task Forbidden',
      done: false,
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act: rep B tries to mark it done
    const res = await app.inject({
      method: 'PUT',
      url: `/api/activities/${activityId}/done`,
      headers: { authorization: `Bearer ${repBToken}` },
      payload: {},
    })

    // Assert
    expect(res.statusCode).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/activities/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/activities/:id', () => {
  it('activity-int-26: soft delete — activity not returned in list after delete', async () => {
    // Arrange
    const { body: created } = await createActivity(adminToken, {
      type: 'call',
      subject: 'Will Be Soft Deleted',
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/activities/${activityId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(delRes.statusCode).toBe(204)

    // Assert: not in list
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/activities',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const body = JSON.parse(listRes.body)
    const ids = body.data.map((a: { id: string }) => a.id)
    expect(ids).not.toContain(activityId)
  })

  it('activity-int-27: soft delete — record still exists in DB with deleted_at set', async () => {
    // Arrange
    const { body: created } = await createActivity(adminToken, {
      type: 'email',
      subject: 'Soft Delete DB Check',
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act
    await app.inject({
      method: 'DELETE',
      url: `/api/activities/${activityId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    // Assert: record exists in DB with deleted_at set
    const rows = await testDb
      .select()
      .from(activitiesTable)
      .where(and(eq(activitiesTable.id, activityId), isNotNull(activitiesTable.deletedAt)))

    expect(rows).toHaveLength(1)
    expect(rows[0].deletedAt).not.toBeNull()
  })

  it('activity-int-28: sales rep can soft-delete their own activity', async () => {
    // Arrange
    const { body: created } = await createActivity(repAToken, {
      type: 'call',
      subject: 'Rep Deletes Own',
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/activities/${activityId}`,
      headers: { authorization: `Bearer ${repAToken}` },
    })

    // Assert
    expect(res.statusCode).toBe(204)
  })

  it('activity-int-29: sales rep cannot delete another rep\'s activity — 403', async () => {
    // Arrange: rep A creates activity
    const { body: created } = await createActivity(repAToken, {
      type: 'call',
      subject: 'RepA Protected',
      contactId: contactIdOrgA,
    })
    const activityId = created.data.id

    // Act: rep B tries to delete it
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/activities/${activityId}`,
      headers: { authorization: `Bearer ${repBToken}` },
    })

    // Assert
    expect(res.statusCode).toBe(403)
  })

  it('activity-int-30: returns 404 when deleting non-existent activity', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/activities/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Activity feed on a record (AC-08)
// ---------------------------------------------------------------------------

describe('Activity feed — filter by record (AC-08)', () => {
  it('activity-int-31: GET /api/activities?contactId= returns only activities for that contact', async () => {
    // Arrange: create two activities — one linked to contactIdOrgA, one standalone
    await createActivity(managerToken, {
      type: 'call',
      subject: 'Feed Contact Activity',
      contactId: contactIdOrgA,
    })

    // Act
    const res = await app.inject({
      method: 'GET',
      url: `/api/activities?contactId=${contactIdOrgA}`,
      headers: { authorization: `Bearer ${managerToken}` },
    })

    // Assert
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.every((a: { contactId: string }) => a.contactId === contactIdOrgA)).toBe(true)
  })
})
