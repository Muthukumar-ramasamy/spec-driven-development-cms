/**
 * Integration tests — Notes repository layer
 * Runs against a real Neon test database (DATABASE_URL must be set).
 * Each test creates its own fixtures and cleans up in afterAll.
 *
 * Test IDs: notes-int-01 … notes-int-16
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import { neon } from '@neondatabase/serverless'
import {
  seedOrganization,
  seedUser,
  cleanupOrg,
} from '../../../test/helpers'
import * as notesRepo from '../repository'

// ─────────────────────────────────────────────────────────────────────────────
// Shared DB helper for raw queries (check soft-delete rows, etc.)
// ─────────────────────────────────────────────────────────────────────────────

const sql = neon(process.env.DATABASE_URL!)

// ─────────────────────────────────────────────────────────────────────────────
// Helper: insert a note directly into the DB
// ─────────────────────────────────────────────────────────────────────────────

async function insertNote(
  overrides: {
    organizationId: string
    authorId: string
    content?: string
    isPinned?: boolean
    dealId?: string | null
    contactId?: string | null
    companyId?: string | null
    leadId?: string | null
  },
) {
  const id = randomUUID()
  const {
    organizationId,
    authorId,
    content = 'Integration test note',
    isPinned = false,
    dealId = null,
    contactId = null,
    companyId = null,
    leadId = null,
  } = overrides

  await sql`
    INSERT INTO notes (
      id, organization_id, author_id, content, is_pinned,
      deal_id, contact_id, company_id, lead_id,
      created_at, updated_at
    ) VALUES (
      ${id}, ${organizationId}, ${authorId}, ${content}, ${isPinned},
      ${dealId}, ${contactId}, ${companyId}, ${leadId},
      NOW(), NOW()
    )
  `
  return id
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite: create
// ─────────────────────────────────────────────────────────────────────────────

describe('notesRepository.create', () => {
  let orgId: string
  let userId: string

  beforeAll(async () => {
    orgId = await seedOrganization()
    const user = await seedUser(orgId, 'sales_rep')
    userId = user.id
  })

  afterAll(async () => {
    await cleanupOrg(orgId)
  })

  it('notes-int-01: inserts a note linked to a contact and returns the record', async () => {
    // Arrange
    const contactId = randomUUID()
    // Insert a dummy contact so FK is satisfied
    await sql`
      INSERT INTO contacts (id, organization_id, first_name, created_at, updated_at)
      VALUES (${contactId}, ${orgId}, 'Int Test', NOW(), NOW())
    `

    // Act
    const note = await notesRepo.create({
      organizationId: orgId,
      authorId: userId,
      content: 'Created via repository test',
      isPinned: false,
      dealId: null,
      contactId,
      companyId: null,
      leadId: null,
    })

    // Assert
    expect(note.id).toBeDefined()
    expect(note.organizationId).toBe(orgId)
    expect(note.authorId).toBe(userId)
    expect(note.contactId).toBe(contactId)
    expect(note.deletedAt).toBeNull()
  })

  it('notes-int-02: BR-01 — authorId on returned record matches the caller id, not any other value', async () => {
    // Arrange
    const anotherUserId = randomUUID()
    await sql`
      INSERT INTO users (id, organization_id, first_name, email, password_hash, role, status, created_at, updated_at)
      VALUES (${anotherUserId}, ${orgId}, 'Another', ${`another-${anotherUserId.slice(0, 6)}@test.com`}, 'hash', 'sales_rep', 'active', NOW(), NOW())
    `
    const contactId = randomUUID()
    await sql`
      INSERT INTO contacts (id, organization_id, first_name, created_at, updated_at)
      VALUES (${contactId}, ${orgId}, 'FK Contact', NOW(), NOW())
    `

    // Act
    const note = await notesRepo.create({
      organizationId: orgId,
      authorId: anotherUserId,
      content: 'Author id integrity check',
      isPinned: false,
      dealId: null,
      contactId,
      companyId: null,
      leadId: null,
    })

    // Assert
    expect(note.authorId).toBe(anotherUserId)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite: findMany — pagination, ordering, soft-delete exclusion, multi-tenancy
// ─────────────────────────────────────────────────────────────────────────────

describe('notesRepository.findMany', () => {
  let orgA: string
  let orgB: string
  let userA: string
  let userB: string
  let contactA: string

  beforeAll(async () => {
    orgA = await seedOrganization()
    orgB = await seedOrganization()

    const ua = await seedUser(orgA, 'sales_rep')
    const ub = await seedUser(orgB, 'sales_rep')
    userA = ua.id
    userB = ub.id

    // Seed a contact in orgA for FK
    contactA = randomUUID()
    await sql`
      INSERT INTO contacts (id, organization_id, first_name, created_at, updated_at)
      VALUES (${contactA}, ${orgA}, 'Org A Contact', NOW(), NOW())
    `
  })

  afterAll(async () => {
    await cleanupOrg(orgA)
    await cleanupOrg(orgB)
  })

  it('notes-int-03: BR-04 — pinned notes sort before unpinned notes', async () => {
    // Arrange
    const unpinnedId = await insertNote({ organizationId: orgA, authorId: userA, contactId: contactA, isPinned: false, content: 'Unpinned' })
    const pinnedId   = await insertNote({ organizationId: orgA, authorId: userA, contactId: contactA, isPinned: true,  content: 'Pinned'   })

    // Act
    const { data } = await notesRepo.findMany(orgA, {
      contactId: contactA,
      page: 1,
      limit: 50,
      sort: 'created_at',
      order: 'desc',
    })

    // Assert — pinned note appears before unpinned
    const ids = data.map((n) => n.id)
    expect(ids.indexOf(pinnedId)).toBeLessThan(ids.indexOf(unpinnedId))
  })

  it('notes-int-04: multi-tenancy — org B cannot see org A notes', async () => {
    // Arrange — insert a note in orgA
    await insertNote({ organizationId: orgA, authorId: userA, contactId: contactA, content: 'Org A private note' })

    // Create a contact in orgB to satisfy FK for the query
    const contactB = randomUUID()
    await sql`
      INSERT INTO contacts (id, organization_id, first_name, created_at, updated_at)
      VALUES (${contactB}, ${orgB}, 'Org B Contact', NOW(), NOW())
    `

    // Act — query orgB for that contactId (which doesn't exist in orgB)
    const { data } = await notesRepo.findMany(orgB, {
      contactId: contactA,       // contactA belongs to orgA; orgB scope is enforced
      page: 1,
      limit: 50,
      sort: 'created_at',
      order: 'desc',
    })

    // Assert
    expect(data).toHaveLength(0)
  })

  it('notes-int-05: soft-deleted notes are excluded from list results', async () => {
    // Arrange
    const noteId = await insertNote({ organizationId: orgA, authorId: userA, contactId: contactA, content: 'To be soft-deleted' })

    // Soft-delete it
    await notesRepo.softDelete(orgA, noteId)

    // Act
    const { data } = await notesRepo.findMany(orgA, {
      contactId: contactA,
      page: 1,
      limit: 200,
      sort: 'created_at',
      order: 'desc',
    })

    // Assert
    const ids = data.map((n) => n.id)
    expect(ids).not.toContain(noteId)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite: findById
// ─────────────────────────────────────────────────────────────────────────────

describe('notesRepository.findById', () => {
  let orgA: string
  let orgB: string
  let userA: string
  let contactA: string

  beforeAll(async () => {
    orgA = await seedOrganization()
    orgB = await seedOrganization()
    const ua = await seedUser(orgA, 'sales_rep')
    userA = ua.id

    contactA = randomUUID()
    await sql`
      INSERT INTO contacts (id, organization_id, first_name, created_at, updated_at)
      VALUES (${contactA}, ${orgA}, 'FK Contact', NOW(), NOW())
    `
  })

  afterAll(async () => {
    await cleanupOrg(orgA)
    await cleanupOrg(orgB)
  })

  it('notes-int-06: returns the note with authorName when found', async () => {
    // Arrange
    const noteId = await insertNote({ organizationId: orgA, authorId: userA, contactId: contactA })

    // Act
    const note = await notesRepo.findById(orgA, noteId)

    // Assert
    expect(note).toBeDefined()
    expect(note!.id).toBe(noteId)
    expect(note!.authorName).toBeDefined()
  })

  it('notes-int-07: returns undefined for a note in a different org (multi-tenancy)', async () => {
    // Arrange
    const noteId = await insertNote({ organizationId: orgA, authorId: userA, contactId: contactA })

    // Act — query with orgB scope
    const note = await notesRepo.findById(orgB, noteId)

    // Assert
    expect(note).toBeUndefined()
  })

  it('notes-int-08: returns undefined for a soft-deleted note', async () => {
    // Arrange
    const noteId = await insertNote({ organizationId: orgA, authorId: userA, contactId: contactA })
    await notesRepo.softDelete(orgA, noteId)

    // Act
    const note = await notesRepo.findById(orgA, noteId)

    // Assert
    expect(note).toBeUndefined()
  })

  it('notes-int-09: returns undefined for a nonexistent ID', async () => {
    // Act
    const note = await notesRepo.findById(orgA, randomUUID())

    // Assert
    expect(note).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite: update
// ─────────────────────────────────────────────────────────────────────────────

describe('notesRepository.update', () => {
  let orgId: string
  let userId: string
  let contactId: string

  beforeAll(async () => {
    orgId = await seedOrganization()
    const user = await seedUser(orgId, 'sales_rep')
    userId = user.id

    contactId = randomUUID()
    await sql`
      INSERT INTO contacts (id, organization_id, first_name, created_at, updated_at)
      VALUES (${contactId}, ${orgId}, 'Update Test Contact', NOW(), NOW())
    `
  })

  afterAll(async () => {
    await cleanupOrg(orgId)
  })

  it('notes-int-10: updates content and reflects change in subsequent findById', async () => {
    // Arrange
    const noteId = await insertNote({ organizationId: orgId, authorId: userId, contactId })

    // Act
    const updated = await notesRepo.update(orgId, noteId, { content: 'Updated content' })

    // Assert
    expect(updated).toBeDefined()
    expect(updated!.content).toBe('Updated content')

    const fetched = await notesRepo.findById(orgId, noteId)
    expect(fetched!.content).toBe('Updated content')
  })

  it('notes-int-11: pins a note (is_pinned set to true)', async () => {
    // Arrange
    const noteId = await insertNote({ organizationId: orgId, authorId: userId, contactId, isPinned: false })

    // Act
    const updated = await notesRepo.update(orgId, noteId, { isPinned: true })

    // Assert
    expect(updated!.isPinned).toBe(true)
  })

  it('notes-int-12: returns undefined when updating a note from a different org', async () => {
    // Arrange
    const otherOrgId = await seedOrganization()
    const noteId = await insertNote({ organizationId: orgId, authorId: userId, contactId })

    // Act
    const result = await notesRepo.update(otherOrgId, noteId, { content: 'Cross-org attempt' })

    // Assert
    expect(result).toBeUndefined()

    // Cleanup
    await cleanupOrg(otherOrgId)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite: softDelete
// ─────────────────────────────────────────────────────────────────────────────

describe('notesRepository.softDelete', () => {
  let orgId: string
  let userId: string
  let contactId: string

  beforeAll(async () => {
    orgId = await seedOrganization()
    const user = await seedUser(orgId, 'sales_rep')
    userId = user.id

    contactId = randomUUID()
    await sql`
      INSERT INTO contacts (id, organization_id, first_name, created_at, updated_at)
      VALUES (${contactId}, ${orgId}, 'SoftDelete Contact', NOW(), NOW())
    `
  })

  afterAll(async () => {
    await cleanupOrg(orgId)
  })

  it('notes-int-13: BR-01 — soft-delete sets deleted_at; record is retained in DB', async () => {
    // Arrange
    const noteId = await insertNote({ organizationId: orgId, authorId: userId, contactId })

    // Act
    await notesRepo.softDelete(orgId, noteId)

    // Assert — raw query confirms deleted_at IS NOT NULL (record retained)
    const rows = await sql`
      SELECT deleted_at FROM notes WHERE id = ${noteId}
    `
    expect(rows).toHaveLength(1)
    expect(rows[0].deleted_at).not.toBeNull()
  })

  it('notes-int-14: soft-deleted note is invisible to findById', async () => {
    // Arrange
    const noteId = await insertNote({ organizationId: orgId, authorId: userId, contactId })

    // Act
    await notesRepo.softDelete(orgId, noteId)
    const found = await notesRepo.findById(orgId, noteId)

    // Assert
    expect(found).toBeUndefined()
  })

  it('notes-int-15: soft-deleted note is invisible in findMany list', async () => {
    // Arrange
    const noteId = await insertNote({ organizationId: orgId, authorId: userId, contactId, content: 'Should disappear' })

    // Act
    await notesRepo.softDelete(orgId, noteId)

    const { data } = await notesRepo.findMany(orgId, {
      contactId,
      page: 1,
      limit: 200,
      sort: 'created_at',
      order: 'desc',
    })

    // Assert
    const ids = data.map((n) => n.id)
    expect(ids).not.toContain(noteId)
  })

  it('notes-int-16: softDelete is a no-op for notes belonging to another org', async () => {
    // Arrange
    const otherOrgId = await seedOrganization()
    const noteId = await insertNote({ organizationId: orgId, authorId: userId, contactId })

    // Act — wrong org scope; should not affect the row
    await notesRepo.softDelete(otherOrgId, noteId)

    // Assert — row still has deleted_at IS NULL in orgId
    const rows = await sql`
      SELECT deleted_at FROM notes WHERE id = ${noteId}
    `
    expect(rows[0].deleted_at).toBeNull()

    // Cleanup
    await cleanupOrg(otherOrgId)
  })
})
