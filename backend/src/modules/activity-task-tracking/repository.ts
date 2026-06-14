import { and, asc, count, desc, eq, ilike, isNull, sql } from 'drizzle-orm'
import { db } from '../../db'
import { activities, Activity, NewActivity } from '../../db/schema/activities'
import { users } from '../../db/schema/users'
import { buildOffset } from '../../lib/pagination'
import type { ListActivitiesQuery } from './schemas'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityRow = Activity & { ownerName: string }

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildWhere(
  organizationId: string,
  filters: Partial<ListActivitiesQuery> & { done?: boolean },
) {
  return and(
    eq(activities.organizationId, organizationId),
    isNull(activities.deletedAt),
    filters.done !== undefined ? eq(activities.done, filters.done) : undefined,
    filters.ownerId ? eq(activities.ownerId, filters.ownerId) : undefined,
    filters.dealId ? eq(activities.dealId, filters.dealId) : undefined,
    filters.contactId ? eq(activities.contactId, filters.contactId) : undefined,
    filters.companyId ? eq(activities.companyId, filters.companyId) : undefined,
    filters.leadId ? eq(activities.leadId, filters.leadId) : undefined,
    filters.search ? ilike(activities.subject, `%${filters.search}%`) : undefined,
  )
}

const enrichedFields = {
  id: activities.id,
  organizationId: activities.organizationId,
  type: activities.type,
  subject: activities.subject,
  notes: activities.notes,
  done: activities.done,
  doneAt: activities.doneAt,
  dueDate: activities.dueDate,
  ownerId: activities.ownerId,
  dealId: activities.dealId,
  contactId: activities.contactId,
  companyId: activities.companyId,
  leadId: activities.leadId,
  createdAt: activities.createdAt,
  updatedAt: activities.updatedAt,
  deletedAt: activities.deletedAt,
  ownerName: sql<string>`TRIM(COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, ''))`,
}

// ─── findMany ─────────────────────────────────────────────────────────────────

export async function findMany(
  organizationId: string,
  filters: ListActivitiesQuery & { done?: boolean },
): Promise<{ data: ActivityRow[]; total: number }> {
  const where = buildWhere(organizationId, filters)
  const offset = buildOffset(filters)
  const orderFn = filters.order === 'asc' ? asc : desc

  const sortCol =
    filters.sort === 'due_date'
      ? activities.dueDate
      : filters.sort === 'subject'
        ? activities.subject
        : activities.createdAt

  const [data, [{ total }]] = await Promise.all([
    db
      .select(enrichedFields)
      .from(activities)
      .leftJoin(users, eq(activities.ownerId, users.id))
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(filters.limit)
      .offset(offset),
    db.select({ total: count() }).from(activities).where(where),
  ])

  return { data: data as ActivityRow[], total }
}

// ─── findById ─────────────────────────────────────────────────────────────────

export async function findById(
  organizationId: string,
  id: string,
): Promise<ActivityRow | undefined> {
  const [row] = await db
    .select(enrichedFields)
    .from(activities)
    .leftJoin(users, eq(activities.ownerId, users.id))
    .where(
      and(
        eq(activities.id, id),
        eq(activities.organizationId, organizationId),
        isNull(activities.deletedAt),
      ),
    )
    .limit(1)
  return row as ActivityRow | undefined
}

// ─── create ───────────────────────────────────────────────────────────────────

export async function create(data: NewActivity): Promise<Activity> {
  const [activity] = await db.insert(activities).values(data).returning()
  return activity
}

// ─── update ───────────────────────────────────────────────────────────────────

export async function update(
  organizationId: string,
  id: string,
  data: Partial<Omit<Activity, 'id' | 'organizationId' | 'createdAt'>>,
): Promise<Activity | undefined> {
  const [updated] = await db
    .update(activities)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(activities.id, id),
        eq(activities.organizationId, organizationId),
        isNull(activities.deletedAt),
      ),
    )
    .returning()
  return updated
}

// ─── softDelete ───────────────────────────────────────────────────────────────
// Never issues DELETE FROM — sets deleted_at = NOW() (soft delete).

export async function softDelete(organizationId: string, id: string): Promise<void> {
  await db
    .update(activities)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(activities.id, id),
        eq(activities.organizationId, organizationId),
        isNull(activities.deletedAt),
      ),
    )
}

// ─── markDone ─────────────────────────────────────────────────────────────────
// Sets done=true, done_at=NOW(), and optionally updates notes.
// BR-02: irreversibility enforced in service before this is called.

export async function markDone(
  organizationId: string,
  id: string,
  notes?: string,
): Promise<Activity | undefined> {
  const patch: Partial<Omit<Activity, 'id' | 'organizationId' | 'createdAt'>> = {
    done: true,
    doneAt: new Date(),
    updatedAt: new Date(),
  }

  if (notes !== undefined) {
    patch.notes = notes
  }

  const [updated] = await db
    .update(activities)
    .set(patch)
    .where(
      and(
        eq(activities.id, id),
        eq(activities.organizationId, organizationId),
        isNull(activities.deletedAt),
      ),
    )
    .returning()
  return updated
}
