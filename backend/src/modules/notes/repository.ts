import { and, asc, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { db } from '../../db'
import { notes, Note, NewNote } from '../../db/schema/notes'
import { users } from '../../db/schema/users'
import { buildOffset } from '../../lib/pagination'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NoteRow = Note & { authorName: string }

export interface ListNotesFilter {
  page: number
  limit: number
  sort: string
  order: 'asc' | 'desc'
  search?: string
  dealId?: string
  contactId?: string
  companyId?: string
  leadId?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds the WHERE clause used by findMany and count queries.
 * ALWAYS scopes by organizationId and filters out soft-deleted records.
 */
function buildWhere(organizationId: string, filters: Partial<ListNotesFilter>) {
  return and(
    eq(notes.organizationId, organizationId),
    isNull(notes.deletedAt),
    filters.dealId    ? eq(notes.dealId,    filters.dealId)    : undefined,
    filters.contactId ? eq(notes.contactId, filters.contactId) : undefined,
    filters.companyId ? eq(notes.companyId, filters.companyId) : undefined,
    filters.leadId    ? eq(notes.leadId,    filters.leadId)    : undefined,
    filters.search
      ? ilike(notes.content, `%${filters.search}%`)
      : undefined,
  )
}

/** Fields selected on every enriched query (includes author's display name). */
const enrichedFields = {
  id:             notes.id,
  organizationId: notes.organizationId,
  authorId:       notes.authorId,
  content:        notes.content,
  isPinned:       notes.isPinned,
  dealId:         notes.dealId,
  contactId:      notes.contactId,
  companyId:      notes.companyId,
  leadId:         notes.leadId,
  createdAt:      notes.createdAt,
  updatedAt:      notes.updatedAt,
  deletedAt:      notes.deletedAt,
  authorName: sql<string>`TRIM(COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, ''))`,
}

// ─── Repository functions ─────────────────────────────────────────────────────

/**
 * List notes for an org with pagination and optional filters.
 * Default sort: is_pinned DESC then created_at DESC (pinned first — BR-04).
 */
export async function findMany(
  organizationId: string,
  filters: ListNotesFilter,
): Promise<{ data: NoteRow[]; total: number }> {
  const where  = buildWhere(organizationId, filters)
  const offset = buildOffset(filters)

  // Build ORDER BY clause.
  // For default sort (created_at), pinned notes always come first per BR-04.
  let orderClauses
  if (filters.sort === 'is_pinned') {
    const dirFn = filters.order === 'asc' ? asc : desc
    orderClauses = [dirFn(notes.isPinned), desc(notes.createdAt)]
  } else {
    // Default: is_pinned DESC first, then created_at in requested direction
    const dirFn = filters.order === 'asc' ? asc : desc
    orderClauses = [desc(notes.isPinned), dirFn(notes.createdAt)]
  }

  const [data, [{ total }]] = await Promise.all([
    db
      .select(enrichedFields)
      .from(notes)
      .leftJoin(users, eq(notes.authorId, users.id))
      .where(where)
      .orderBy(...orderClauses)
      .limit(filters.limit)
      .offset(offset),
    db.select({ total: count() }).from(notes).where(where),
  ])

  return { data: data as NoteRow[], total }
}

/**
 * Fetch a single note by ID scoped to the organisation.
 * Returns undefined when not found or soft-deleted.
 */
export async function findById(
  organizationId: string,
  id: string,
): Promise<NoteRow | undefined> {
  const [row] = await db
    .select(enrichedFields)
    .from(notes)
    .leftJoin(users, eq(notes.authorId, users.id))
    .where(
      and(
        eq(notes.id,             id),
        eq(notes.organizationId, organizationId),
        isNull(notes.deletedAt),
      ),
    )
    .limit(1)
  return row as NoteRow | undefined
}

/**
 * Insert a new note. organizationId and authorId must already be set on `data`.
 */
export async function create(data: NewNote): Promise<Note> {
  const [note] = await db.insert(notes).values(data).returning()
  return note
}

/**
 * Update mutable fields (content, isPinned) on a note.
 * Scoped by org; only affects non-deleted records.
 */
export async function update(
  organizationId: string,
  id: string,
  data: Partial<Pick<Note, 'content' | 'isPinned'>>,
): Promise<Note | undefined> {
  const [updated] = await db
    .update(notes)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(notes.id,             id),
        eq(notes.organizationId, organizationId),
        isNull(notes.deletedAt),
      ),
    )
    .returning()
  return updated
}

/**
 * Soft-delete a note. Sets deleted_at = NOW().
 * Never uses DELETE FROM — non-negotiable invariant.
 */
export async function softDelete(organizationId: string, id: string): Promise<void> {
  await db
    .update(notes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(notes.id,             id),
        eq(notes.organizationId, organizationId),
        isNull(notes.deletedAt),
      ),
    )
}
