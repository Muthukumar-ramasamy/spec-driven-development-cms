import { and, asc, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { db } from '../../db'
import { contacts, Contact, NewContact } from '../../db/schema/contacts'
import { users } from '../../db/schema/users'
import { buildOffset } from '../../lib/pagination'

export type ContactRow = Contact & { ownerName: string; companyName: string | null }

export interface ListContactsFilter {
  page: number
  limit: number
  sort: string
  order: 'asc' | 'desc'
  search?: string
  ownerId?: string
  companyId?: string
}

function buildWhere(organizationId: string, filters: Partial<ListContactsFilter>) {
  return and(
    eq(contacts.organizationId, organizationId),
    isNull(contacts.deletedAt),
    filters.search
      ? or(
          ilike(contacts.firstName, `%${filters.search}%`),
          ilike(contacts.lastName, `%${filters.search}%`),
          ilike(contacts.email, `%${filters.search}%`),
        )
      : undefined,
    filters.ownerId ? eq(contacts.ownerId, filters.ownerId) : undefined,
    filters.companyId ? eq(contacts.companyId, filters.companyId) : undefined,
  )
}

const enrichedFields = {
  id: contacts.id,
  organizationId: contacts.organizationId,
  ownerId: contacts.ownerId,
  createdBy: contacts.createdBy,
  companyId: contacts.companyId,
  firstName: contacts.firstName,
  lastName: contacts.lastName,
  email: contacts.email,
  phone: contacts.phone,
  jobTitle: contacts.jobTitle,
  linkedinUrl: contacts.linkedinUrl,
  source: contacts.source,
  createdAt: contacts.createdAt,
  updatedAt: contacts.updatedAt,
  deletedAt: contacts.deletedAt,
  ownerName: sql<string>`TRIM(COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, ''))`,
  companyName: sql<string | null>`NULL::text`,
}

export async function findMany(
  organizationId: string,
  filters: ListContactsFilter,
): Promise<{ data: ContactRow[]; total: number }> {
  const where = buildWhere(organizationId, filters)
  const offset = buildOffset(filters)
  const orderFn = filters.order === 'asc' ? asc : desc
  const sortCol =
    filters.sort === 'first_name'
      ? contacts.firstName
      : filters.sort === 'email'
        ? contacts.email
        : contacts.createdAt

  const [data, [{ total }]] = await Promise.all([
    db
      .select(enrichedFields)
      .from(contacts)
      .leftJoin(users, eq(contacts.ownerId, users.id))
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(filters.limit)
      .offset(offset),
    db.select({ total: count() }).from(contacts).where(where),
  ])

  return { data: data as ContactRow[], total }
}

export async function findById(
  organizationId: string,
  id: string,
): Promise<ContactRow | undefined> {
  const [row] = await db
    .select(enrichedFields)
    .from(contacts)
    .leftJoin(users, eq(contacts.ownerId, users.id))
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.organizationId, organizationId),
        isNull(contacts.deletedAt),
      ),
    )
    .limit(1)
  return row as ContactRow | undefined
}

export async function findByEmail(
  organizationId: string,
  email: string,
): Promise<Contact | undefined> {
  const [row] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.organizationId, organizationId),
        eq(contacts.email, email.toLowerCase()),
        isNull(contacts.deletedAt),
      ),
    )
    .limit(1)
  return row
}

export async function create(data: NewContact): Promise<Contact> {
  const [contact] = await db.insert(contacts).values(data).returning()
  return contact
}

export async function update(
  organizationId: string,
  id: string,
  data: Partial<Omit<Contact, 'id' | 'organizationId' | 'createdAt' | 'createdBy'>>,
): Promise<Contact | undefined> {
  const [updated] = await db
    .update(contacts)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.organizationId, organizationId),
        isNull(contacts.deletedAt),
      ),
    )
    .returning()
  return updated
}

export async function softDelete(organizationId: string, id: string): Promise<void> {
  await db
    .update(contacts)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.organizationId, organizationId),
        isNull(contacts.deletedAt),
      ),
    )
}
