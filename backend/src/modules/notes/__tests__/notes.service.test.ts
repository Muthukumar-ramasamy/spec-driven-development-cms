/**
 * Unit tests — Notes service layer
 * All repository calls are mocked. No DB connection required.
 *
 * Test IDs: notes-unit-01 … notes-unit-18
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors'
import type { JWTPayload } from '../../../lib/auth'
import type { NoteRow } from '../repository'

// ── Mock the repository ────────────────────────────────────────────────────────
vi.mock('../repository')
import * as repo from '../repository'

// ── Import service under test (after mock hoisting) ────────────────────────────
import {
  listNotes,
  createNote,
  getNoteById,
  updateNote,
  deleteNote,
} from '../service'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ORG_A = '00000000-0000-0000-0000-000000000001'
const ORG_B = '00000000-0000-0000-0000-000000000002'
const AUTHOR_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER_USER_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const NOTE_ID = 'cccccccc-0000-0000-0000-000000000001'
const DEAL_ID = 'dddddddd-0000-0000-0000-000000000001'
const CONTACT_ID = 'eeeeeeee-0000-0000-0000-000000000001'

function makeJwt(
  overrides: Partial<JWTPayload> = {},
): JWTPayload {
  return {
    sub: AUTHOR_ID,
    organizationId: ORG_A,
    role: 'sales_rep',
    iat: 0,
    exp: 9999999999,
    ...overrides,
  }
}

function makeNote(overrides: Partial<NoteRow> = {}): NoteRow {
  return {
    id: NOTE_ID,
    organizationId: ORG_A,
    authorId: AUTHOR_ID,
    content: 'Meeting went well.',
    isPinned: false,
    dealId: DEAL_ID,
    contactId: null,
    companyId: null,
    leadId: null,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    deletedAt: null,
    authorName: 'Jane Doe',
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// listNotes
// ─────────────────────────────────────────────────────────────────────────────

describe('notesService.listNotes', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('notes-unit-01: returns paginated notes when a valid filter is provided', async () => {
    // Arrange
    const caller = makeJwt()
    const mockNotes = [makeNote(), makeNote({ id: 'cccccccc-0000-0000-0000-000000000002', isPinned: true })]
    vi.mocked(repo.findMany).mockResolvedValue({ data: mockNotes, total: 2 })

    // Act
    const result = await listNotes(caller, {
      dealId: DEAL_ID,
      page: 1,
      limit: 50,
      sort: 'created_at',
      order: 'desc',
    })

    // Assert
    expect(result.data).toHaveLength(2)
    expect(result.pagination.total).toBe(2)
    expect(repo.findMany).toHaveBeenCalledWith(ORG_A, expect.objectContaining({ dealId: DEAL_ID }))
  })

  it('notes-unit-02: BR-05 — throws ValidationError when no filter param is provided', async () => {
    // Arrange
    const caller = makeJwt()

    // Act & Assert
    await expect(
      listNotes(caller, { page: 1, limit: 50, sort: 'created_at', order: 'desc' }),
    ).rejects.toThrow(ValidationError)

    await expect(
      listNotes(caller, { page: 1, limit: 50, sort: 'created_at', order: 'desc' }),
    ).rejects.toThrow('At least one filter param is required')
  })

  it('notes-unit-03: passes contactId filter to repository', async () => {
    // Arrange
    const caller = makeJwt()
    vi.mocked(repo.findMany).mockResolvedValue({ data: [], total: 0 })

    // Act
    await listNotes(caller, {
      contactId: CONTACT_ID,
      page: 1,
      limit: 50,
      sort: 'created_at',
      order: 'desc',
    })

    // Assert
    expect(repo.findMany).toHaveBeenCalledWith(
      ORG_A,
      expect.objectContaining({ contactId: CONTACT_ID }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createNote
// ─────────────────────────────────────────────────────────────────────────────

describe('notesService.createNote', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('notes-unit-04: BR-01 — author_id is taken from JWT sub, never from request body', async () => {
    // Arrange
    const caller = makeJwt({ sub: AUTHOR_ID })
    const mockNote = makeNote()
    vi.mocked(repo.create).mockResolvedValue(mockNote)

    // Act
    await createNote(caller, { content: 'Meeting note', dealId: DEAL_ID, isPinned: false })

    // Assert — repo.create must receive authorId from JWT, not from any body field
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: AUTHOR_ID }),
    )
  })

  it('notes-unit-05: BR-02 — throws ValidationError when no linked record is provided', async () => {
    // Arrange
    const caller = makeJwt()

    // Act & Assert
    await expect(
      createNote(caller, { content: 'No link', isPinned: false }),
    ).rejects.toThrow(ValidationError)

    await expect(
      createNote(caller, { content: 'No link', isPinned: false }),
    ).rejects.toThrow('A note must be linked to at least one record.')
  })

  it('notes-unit-06: creates note linked to a deal successfully', async () => {
    // Arrange
    const caller = makeJwt()
    const mockNote = makeNote()
    vi.mocked(repo.create).mockResolvedValue(mockNote)

    // Act
    const result = await createNote(caller, { content: 'Meeting note', dealId: DEAL_ID, isPinned: false })

    // Assert
    expect(result).toEqual(mockNote)
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_A,
        authorId: AUTHOR_ID,
        content: 'Meeting note',
        isPinned: false,
        dealId: DEAL_ID,
      }),
    )
  })

  it('notes-unit-07: creates note linked to a contact successfully', async () => {
    // Arrange
    const caller = makeJwt()
    const mockNote = makeNote({ contactId: CONTACT_ID, dealId: null })
    vi.mocked(repo.create).mockResolvedValue(mockNote)

    // Act
    const result = await createNote(caller, { content: 'Contact note', contactId: CONTACT_ID, isPinned: false })

    // Assert
    expect(result).toEqual(mockNote)
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: CONTACT_ID }),
    )
  })

  it('notes-unit-08: isPinned defaults to false when not supplied', async () => {
    // Arrange
    const caller = makeJwt()
    const mockNote = makeNote({ isPinned: false })
    vi.mocked(repo.create).mockResolvedValue(mockNote)

    // Act
    await createNote(caller, { content: 'Quick note', dealId: DEAL_ID })

    // Assert
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ isPinned: false }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getNoteById
// ─────────────────────────────────────────────────────────────────────────────

describe('notesService.getNoteById', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('notes-unit-09: returns the note when found', async () => {
    // Arrange
    const caller = makeJwt()
    const mockNote = makeNote()
    vi.mocked(repo.findById).mockResolvedValue(mockNote)

    // Act
    const result = await getNoteById(caller, NOTE_ID)

    // Assert
    expect(result).toEqual(mockNote)
    expect(repo.findById).toHaveBeenCalledWith(ORG_A, NOTE_ID)
  })

  it('notes-unit-10: throws NotFoundError when note does not exist', async () => {
    // Arrange
    const caller = makeJwt()
    vi.mocked(repo.findById).mockResolvedValue(undefined)

    // Act & Assert
    await expect(getNoteById(caller, NOTE_ID)).rejects.toThrow(NotFoundError)
    await expect(getNoteById(caller, NOTE_ID)).rejects.toThrow('Note not found')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateNote
// ─────────────────────────────────────────────────────────────────────────────

describe('notesService.updateNote', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('notes-unit-11: BR-03 / AC-03 — author can edit their own note', async () => {
    // Arrange
    const caller = makeJwt({ sub: AUTHOR_ID, role: 'sales_rep' })
    const existingNote = makeNote({ authorId: AUTHOR_ID })
    const updatedNote = makeNote({ content: 'Updated content' })
    vi.mocked(repo.findById).mockResolvedValue(existingNote)
    vi.mocked(repo.update).mockResolvedValue(updatedNote)

    // Act
    const result = await updateNote(caller, NOTE_ID, { content: 'Updated content' })

    // Assert
    expect(result).toEqual(updatedNote)
    expect(repo.update).toHaveBeenCalledWith(
      ORG_A,
      NOTE_ID,
      expect.objectContaining({ content: 'Updated content' }),
    )
  })

  it('notes-unit-12: BR-03 / AC-04 — non-author non-admin gets ForbiddenError', async () => {
    // Arrange
    const caller = makeJwt({ sub: OTHER_USER_ID, role: 'sales_rep' })
    const existingNote = makeNote({ authorId: AUTHOR_ID }) // different author
    vi.mocked(repo.findById).mockResolvedValue(existingNote)

    // Act & Assert
    await expect(
      updateNote(caller, NOTE_ID, { content: 'Attempted edit' }),
    ).rejects.toThrow(ForbiddenError)

    await expect(
      updateNote(caller, NOTE_ID, { content: 'Attempted edit' }),
    ).rejects.toThrow('You can only edit notes you created.')
  })

  it('notes-unit-13: admin can edit any note regardless of authorship', async () => {
    // Arrange
    const caller = makeJwt({ sub: OTHER_USER_ID, role: 'admin' })
    const existingNote = makeNote({ authorId: AUTHOR_ID })
    const updatedNote = makeNote({ content: 'Admin edit' })
    vi.mocked(repo.findById).mockResolvedValue(existingNote)
    vi.mocked(repo.update).mockResolvedValue(updatedNote)

    // Act
    const result = await updateNote(caller, NOTE_ID, { content: 'Admin edit' })

    // Assert
    expect(result).toEqual(updatedNote)
    expect(repo.update).toHaveBeenCalled()
  })

  it('notes-unit-14: manager cannot edit another user's note (ForbiddenError)', async () => {
    // Arrange
    const caller = makeJwt({ sub: OTHER_USER_ID, role: 'manager' })
    const existingNote = makeNote({ authorId: AUTHOR_ID })
    vi.mocked(repo.findById).mockResolvedValue(existingNote)

    // Act & Assert
    await expect(
      updateNote(caller, NOTE_ID, { content: 'Manager edit attempt' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('notes-unit-15: throws NotFoundError when note does not exist', async () => {
    // Arrange
    const caller = makeJwt()
    vi.mocked(repo.findById).mockResolvedValue(undefined)

    // Act & Assert
    await expect(
      updateNote(caller, NOTE_ID, { content: 'Does not matter' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('notes-unit-16: BR-04 — can pin a note (isPinned toggled to true)', async () => {
    // Arrange
    const caller = makeJwt({ sub: AUTHOR_ID })
    const existingNote = makeNote({ isPinned: false })
    const pinnedNote = makeNote({ isPinned: true })
    vi.mocked(repo.findById).mockResolvedValue(existingNote)
    vi.mocked(repo.update).mockResolvedValue(pinnedNote)

    // Act
    const result = await updateNote(caller, NOTE_ID, { isPinned: true })

    // Assert
    expect(result.isPinned).toBe(true)
    expect(repo.update).toHaveBeenCalledWith(
      ORG_A,
      NOTE_ID,
      expect.objectContaining({ isPinned: true }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// deleteNote
// ─────────────────────────────────────────────────────────────────────────────

describe('notesService.deleteNote', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('notes-unit-17: AC-05 — author can soft-delete their own note', async () => {
    // Arrange
    const caller = makeJwt({ sub: AUTHOR_ID, role: 'sales_rep' })
    const existingNote = makeNote({ authorId: AUTHOR_ID })
    vi.mocked(repo.findById).mockResolvedValue(existingNote)
    vi.mocked(repo.softDelete).mockResolvedValue(undefined)

    // Act
    await deleteNote(caller, NOTE_ID)

    // Assert — softDelete called, never hardDelete
    expect(repo.softDelete).toHaveBeenCalledWith(ORG_A, NOTE_ID)
  })

  it('notes-unit-18: AC-06 — non-author non-admin gets ForbiddenError on delete', async () => {
    // Arrange
    const caller = makeJwt({ sub: OTHER_USER_ID, role: 'sales_rep' })
    const existingNote = makeNote({ authorId: AUTHOR_ID })
    vi.mocked(repo.findById).mockResolvedValue(existingNote)

    // Act & Assert
    await expect(deleteNote(caller, NOTE_ID)).rejects.toThrow(ForbiddenError)
    await expect(deleteNote(caller, NOTE_ID)).rejects.toThrow('You can only delete notes you created.')
    expect(repo.softDelete).not.toHaveBeenCalled()
  })

  it('notes-unit-19: AC-07 — admin can soft-delete any note', async () => {
    // Arrange
    const caller = makeJwt({ sub: OTHER_USER_ID, role: 'admin' })
    const existingNote = makeNote({ authorId: AUTHOR_ID })
    vi.mocked(repo.findById).mockResolvedValue(existingNote)
    vi.mocked(repo.softDelete).mockResolvedValue(undefined)

    // Act
    await deleteNote(caller, NOTE_ID)

    // Assert
    expect(repo.softDelete).toHaveBeenCalledWith(ORG_A, NOTE_ID)
  })

  it('notes-unit-20: manager cannot delete another user's note (ForbiddenError)', async () => {
    // Arrange
    const caller = makeJwt({ sub: OTHER_USER_ID, role: 'manager' })
    const existingNote = makeNote({ authorId: AUTHOR_ID })
    vi.mocked(repo.findById).mockResolvedValue(existingNote)

    // Act & Assert
    await expect(deleteNote(caller, NOTE_ID)).rejects.toThrow(ForbiddenError)
  })

  it('notes-unit-21: throws NotFoundError when note does not exist', async () => {
    // Arrange
    const caller = makeJwt()
    vi.mocked(repo.findById).mockResolvedValue(undefined)

    // Act & Assert
    await expect(deleteNote(caller, NOTE_ID)).rejects.toThrow(NotFoundError)
    expect(repo.softDelete).not.toHaveBeenCalled()
  })
})
