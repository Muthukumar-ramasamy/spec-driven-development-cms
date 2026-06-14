import { and, asc, count, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '../../db'
import { leads, Lead, NewLead } from '../../db/schema/leads'
import { users } from '../../db/schema/users'
import { buildOffset } from '../../lib/pagination'
import type { ListLeadsQuery } from './schemas'

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeadRow = Lead & { ownerName: string }

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildWhere(
  organizationId: string,
  filters: Partial<ListLeadsQuery> & { statusList?: string[] },
) {
  return and(
    eq(leads.organizationId, organizationId),
    isNull(leads.deletedAt),
    filters.statusList && filters.statusList.length > 0
      ? inArray(leads.status, filters.statusList as Lead['status'][])
      : undefined,
    filters.ownerId ? eq(leads.ownerId, filters.ownerId) : undefined,
    filters.search ? ilike(leads.title, `%${filters.search}%`) : undefined,
  )
}

const enrichedFields = {
  id: leads.id,
  organizationId: leads.organizationId,
  title: leads.title,
  value: leads.value,
  status: leads.status,
  source: leads.source,
  ownerId: leads.ownerId,
  contactId: leads.contactId,
  companyId: leads.companyId,
  convertedAt: leads.convertedAt,
  convertedDealId: leads.convertedDealId,
  createdAt: leads.createdAt,
  updatedAt: leads.updatedAt,
  deletedAt: leads.deletedAt,
  ownerName: sql<string>`TRIM(COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, ''))`,
}

// ─── findMany ─────────────────────────────────────────────────────────────────

export async function findMany(
  organizationId: string,
  filters: ListLeadsQuery & { statusList?: string[] },
): Promise<{ data: LeadRow[]; total: number }> {
  const where = buildWhere(organizationId, filters)
  const offset = buildOffset(filters)
  const orderFn = filters.order === 'asc' ? asc : desc

  const sortCol =
    filters.sort === 'title'
      ? leads.title
      : filters.sort === 'value'
        ? leads.value
        : filters.sort === 'status'
          ? leads.status
          : leads.createdAt

  const [data, [{ total }]] = await Promise.all([
    db
      .select(enrichedFields)
      .from(leads)
      .leftJoin(users, eq(leads.ownerId, users.id))
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(filters.limit)
      .offset(offset),
    db.select({ total: count() }).from(leads).where(where),
  ])

  return { data: data as LeadRow[], total }
}

// ─── findById ─────────────────────────────────────────────────────────────────

export async function findById(
  organizationId: string,
  id: string,
): Promise<LeadRow | undefined> {
  const [row] = await db
    .select(enrichedFields)
    .from(leads)
    .leftJoin(users, eq(leads.ownerId, users.id))
    .where(
      and(
        eq(leads.id, id),
        eq(leads.organizationId, organizationId),
        isNull(leads.deletedAt),
      ),
    )
    .limit(1)
  return row as LeadRow | undefined
}

// ─── create ───────────────────────────────────────────────────────────────────

export async function create(data: NewLead): Promise<Lead> {
  const [lead] = await db.insert(leads).values(data).returning()
  return lead
}

// ─── update ───────────────────────────────────────────────────────────────────

export async function update(
  organizationId: string,
  id: string,
  data: Partial<Omit<Lead, 'id' | 'organizationId' | 'createdAt'>>,
): Promise<Lead | undefined> {
  const [updated] = await db
    .update(leads)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(leads.id, id),
        eq(leads.organizationId, organizationId),
        isNull(leads.deletedAt),
      ),
    )
    .returning()
  return updated
}

// ─── softDelete ───────────────────────────────────────────────────────────────
// Never issues DELETE FROM — sets deleted_at = NOW() (soft delete).

export async function softDelete(organizationId: string, id: string): Promise<void> {
  await db
    .update(leads)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(leads.id, id),
        eq(leads.organizationId, organizationId),
        isNull(leads.deletedAt),
      ),
    )
}

// ─── convertLead ─────────────────────────────────────────────────────────────
// Sets status = 'converted', converted_at = NOW(), and optionally links the deal.

export async function convertLead(
  organizationId: string,
  id: string,
  dealId: string | null,
): Promise<Lead | undefined> {
  const [updated] = await db
    .update(leads)
    .set({
      status: 'converted',
      convertedAt: new Date(),
      convertedDealId: dealId ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(leads.id, id),
        eq(leads.organizationId, organizationId),
        isNull(leads.deletedAt),
      ),
    )
    .returning()
  return updated
}
