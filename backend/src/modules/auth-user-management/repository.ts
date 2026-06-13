import { and, asc, count, desc, eq, ilike, isNull, or } from 'drizzle-orm'
import { db } from '../../db'
import { Organization, organizations } from '../../db/schema/organizations'
import { User, users } from '../../db/schema/users'

// ── Organizations ─────────────────────────────────────────────────────────────

export async function createOrganization(
  data: Pick<Organization, 'name' | 'slug'>,
): Promise<Organization> {
  const [org] = await db.insert(organizations).values(data).returning()
  return org
}

// ── Users: reads ──────────────────────────────────────────────────────────────

export async function findUserByEmailGlobal(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
    .limit(1)
  return user
}

export async function findUserByEmailInOrg(
  organizationId: string,
  email: string,
): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.email, email.toLowerCase()),
        isNull(users.deletedAt),
      ),
    )
    .limit(1)
  return user
}

export async function findUserById(
  organizationId: string,
  id: string,
): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, id),
        eq(users.organizationId, organizationId),
        isNull(users.deletedAt),
      ),
    )
    .limit(1)
  return user
}

export async function findUserByInviteToken(token: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.inviteToken, token), isNull(users.deletedAt)))
    .limit(1)
  return user
}

export async function findUserByResetToken(token: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.passwordResetToken, token), isNull(users.deletedAt)))
    .limit(1)
  return user
}

export async function countActiveAdmins(organizationId: string): Promise<number> {
  const [result] = await db
    .select({ total: count() })
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.role, 'admin'),
        eq(users.status, 'active'),
        isNull(users.deletedAt),
      ),
    )
  return result?.total ?? 0
}

export interface ListUsersFilter {
  page: number
  limit: number
  search?: string
  role?: 'admin' | 'manager' | 'sales_rep'
  status?: 'active' | 'pending' | 'deactivated'
  order?: 'asc' | 'desc'
}

export async function findManyUsers(
  organizationId: string,
  filters: ListUsersFilter,
): Promise<{ data: User[]; total: number }> {
  const offset = (filters.page - 1) * filters.limit

  const whereClause = and(
    eq(users.organizationId, organizationId),
    isNull(users.deletedAt),
    filters.search
      ? or(
          ilike(users.firstName, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`),
        )
      : undefined,
    filters.role ? eq(users.role, filters.role) : undefined,
    filters.status ? eq(users.status, filters.status) : undefined,
  )

  const orderFn = filters.order === 'asc' ? asc : desc

  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(orderFn(users.createdAt))
      .limit(filters.limit)
      .offset(offset),
    db.select({ total: count() }).from(users).where(whereClause),
  ])

  return { data, total }
}

// ── Users: writes ─────────────────────────────────────────────────────────────

export async function createUser(
  data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<User> {
  const [user] = await db.insert(users).values(data).returning()
  return user
}

export async function updateUser(
  organizationId: string,
  id: string,
  data: Partial<Omit<User, 'id' | 'organizationId' | 'createdAt'>>,
): Promise<User | undefined> {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(users.id, id),
        eq(users.organizationId, organizationId),
        isNull(users.deletedAt),
      ),
    )
    .returning()
  return updated
}

export async function softDeleteUser(organizationId: string, id: string): Promise<void> {
  await db
    .update(users)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(users.id, id),
        eq(users.organizationId, organizationId),
        isNull(users.deletedAt),
      ),
    )
}
