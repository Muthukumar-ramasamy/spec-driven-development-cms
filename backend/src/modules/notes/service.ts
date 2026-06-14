import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors'
import { JWTPayload } from '../../lib/auth'
import { buildPaginationMeta } from '../../lib/pagination'
import * as repo from './repository'
import type { CreateNoteInput, UpdateNoteInput, ListNotesQuery } from './schemas'

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List notes filtered by at least one linked record.
 *
 * BR-05: GET /api/notes requires at least one of dealId/contactId/companyId/leadId.
 *         Returns 400 VALIDATION_ERROR if none provided.
 */
export async function listNotes(caller: JWTPayload, query: ListNotesQuery) {
  // BR-05 enforcement
  if (!query.dealId && !query.contactId && !query.companyId && !query.leadId) {
    throw new ValidationError(
      'At least one filter param is required: dealId, contactId, companyId, or leadId.',
    )
  }

  const { data, total } = await repo.findMany(caller.organizationId, {
    page:      query.page,
    limit:     query.limit,
    sort:      query.sort,
    order:     query.order,
    search:    query.search,
    dealId:    query.dealId,
    contactId: query.contactId,
    companyId: query.companyId,
    leadId:    query.leadId,
  })

  const pagination = buildPaginationMeta({ page: query.page, limit: query.limit }, total)
  return { data, pagination }
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new note.
 *
 * BR-01: author_id is always taken from the JWT (caller.sub), never from the request body.
 * BR-02: At least one linked record (deal/contact/company/lead) must be provided.
 */
export async function createNote(caller: JWTPayload, input: CreateNoteInput) {
  // BR-02: linked record validation (defence-in-depth; DB CHECK also enforces this)
  if (!input.dealId && !input.contactId && !input.companyId && !input.leadId) {
    throw new ValidationError('A note must be linked to at least one record.')
  }

  const note = await repo.create({
    organizationId: caller.organizationId,
    authorId:       caller.sub,          // BR-01: from JWT only
    content:        input.content,
    isPinned:       input.isPinned ?? false,
    dealId:         input.dealId    ?? null,
    contactId:      input.contactId ?? null,
    companyId:      input.companyId ?? null,
    leadId:         input.leadId    ?? null,
  })

  return note
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

/**
 * Fetch a single note.  All authenticated roles can read any note in their org.
 */
export async function getNoteById(caller: JWTPayload, id: string) {
  const note = await repo.findById(caller.organizationId, id)
  if (!note) throw new NotFoundError('Note')
  return note
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update a note's content and/or pin status.
 *
 * BR-03 (AC-04): Only the note's author OR an Admin can edit.
 *                Managers and other sales reps get 403.
 */
export async function updateNote(
  caller: JWTPayload,
  id: string,
  input: UpdateNoteInput,
) {
  const note = await repo.findById(caller.organizationId, id)
  if (!note) throw new NotFoundError('Note')

  // BR-03: only author or admin may edit
  if (caller.role !== 'admin' && note.authorId !== caller.sub) {
    throw new ForbiddenError('You can only edit notes you created.')
  }

  const updates: Partial<Pick<typeof note, 'content' | 'isPinned'>> = {}
  if (input.content  !== undefined) updates.content  = input.content
  if (input.isPinned !== undefined) updates.isPinned = input.isPinned

  const updated = await repo.update(caller.organizationId, id, updates)
  if (!updated) throw new NotFoundError('Note')

  return updated
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Soft-delete a note (deleted_at = NOW()).
 *
 * BR-01 / AC-05 / AC-06 / AC-07:
 *   - The note's author can delete their own note.
 *   - Admin can delete any note.
 *   - Everyone else gets 403.
 */
export async function deleteNote(caller: JWTPayload, id: string) {
  const note = await repo.findById(caller.organizationId, id)
  if (!note) throw new NotFoundError('Note')

  // BR-03: only author or admin may delete
  if (caller.role !== 'admin' && note.authorId !== caller.sub) {
    throw new ForbiddenError('You can only delete notes you created.')
  }

  await repo.softDelete(caller.organizationId, id)
}
