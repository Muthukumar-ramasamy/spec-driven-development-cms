import { and, asc, count, desc, eq, ilike, isNull, sql } from 'drizzle-orm'
import { db } from '../../db'
import { companies, Company, NewCompany } from '../../db/schema/companies'
import { contacts } from '../../db/schema/contacts'
import { users } from '../../db/schema/users'
import { buildOffset } from '../../lib/pagination'
import type { ListCompaniesQuery } from './schemas'

// ─── Types ───────────────────────────────────────────────────────────────────

export type CompanyRow = Company & { ownerName: string }

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildWhere(organizationId: string, filters: Partial<ListCompaniesQuery>) {
  return and(
    eq(companies.organizationId, organizationId),
    isNull(companies.deletedAt),
    filters.search
      ? ilike(companies.name, `%${filters.search}%`)
      : undefined,
  )
}

const enrichedFields = {
  id: companies.id,
  organizationId: companies.organizationId,
  ownerId: companies.ownerId,
  name: companies.name,
  website: companies.website,
  industry: companies.industry,
  employeeCount: companies.employeeCount,
  notes: companies.notes,
  createdAt: companies.createdAt,
  updatedAt: companies.updatedAt,
  deletedAt: companies.deletedAt,
  ownerName: sql<string>`TRIM(COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, ''))`,
}

// ─── findMany ─────────────────────────────────────────────────────────────────

export async function findMany(
  organizationId: string,
  filters: ListCompaniesQuery,
): Promise<{ data: CompanyRow[]; total: number }> {
  const where = buildWhere(organizationId, filters)
  const offset = buildOffset(filters)
  const orderFn = filters.order === 'asc' ? asc : desc
  const sortCol = filters.sort === 'name' ? companies.name : companies.createdAt

  const [data, [{ total }]] = await Promise.all([
    db
      .select(enrichedFields)
      .from(companies)
      .leftJoin(users, eq(companies.ownerId, users.id))
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(filters.limit)
      .offset(offset),
    db.select({ total: count() }).from(companies).where(where),
  ])

  return { data: data as CompanyRow[], total }
}

// ─── findById ─────────────────────────────────────────────────────────────────

export async function findById(
  organizationId: string,
  id: string,
): Promise<CompanyRow | undefined> {
  const [row] = await db
    .select(enrichedFields)
    .from(companies)
    .leftJoin(users, eq(companies.ownerId, users.id))
    .where(
      and(
        eq(companies.id, id),
        eq(companies.organizationId, organizationId),
        isNull(companies.deletedAt),
      ),
    )
    .limit(1)
  return row as CompanyRow | undefined
}

// ─── findByName ───────────────────────────────────────────────────────────────

export async function findByName(
  organizationId: string,
  name: string,
): Promise<Company | undefined> {
  const [row] = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.organizationId, organizationId),
        eq(companies.name, name),
        isNull(companies.deletedAt),
      ),
    )
    .limit(1)
  return row
}

// ─── create ───────────────────────────────────────────────────────────────────

export async function create(data: NewCompany): Promise<Company> {
  const [company] = await db.insert(companies).values(data).returning()
  return company
}

// ─── update ───────────────────────────────────────────────────────────────────

export async function update(
  organizationId: string,
  id: string,
  data: Partial<Omit<Company, 'id' | 'organizationId' | 'createdAt'>>,
): Promise<Company | undefined> {
  const [updated] = await db
    .update(companies)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(companies.id, id),
        eq(companies.organizationId, organizationId),
        isNull(companies.deletedAt),
      ),
    )
    .returning()
  return updated
}

// ─── softDelete ───────────────────────────────────────────────────────────────

export async function softDelete(organizationId: string, id: string): Promise<void> {
  await db
    .update(companies)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(companies.id, id),
        eq(companies.organizationId, organizationId),
        isNull(companies.deletedAt),
      ),
    )
}

// ─── unlinkCompanyContacts (BR-02) ────────────────────────────────────────────
// Sets company_id = NULL on all non-deleted contacts linked to the given company.
// Called after soft-deleting a company so contacts are not orphaned to a deleted account.

export async function unlinkCompanyContacts(
  organizationId: string,
  companyId: string,
): Promise<void> {
  await db
    .update(contacts)
    .set({ companyId: null, updatedAt: new Date() })
    .where(
      and(
        eq(contacts.organizationId, organizationId),
        eq(contacts.companyId, companyId),
        isNull(contacts.deletedAt),
      ),
    )
}
