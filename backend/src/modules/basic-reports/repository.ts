import { and, asc, eq, gte, isNull, lte, sql } from 'drizzle-orm'
import { db } from '../../db'
import { deals } from '../../db/schema/deals'
import { pipelineStages } from '../../db/schema/pipeline-stages'
import { activities } from '../../db/schema/activities'
import { leads } from '../../db/schema/leads'
import { users } from '../../db/schema/users'
import type {
  DealsReportData,
  PipelineValueData,
  ActivitiesReportData,
  LeadsBySourceData,
} from './schemas'

// ─────────────────────────────────────────────────────────────────────────────
// DEALS REPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate won and lost deal counts + total values within a date range.
 * Scoped to organization_id + deleted_at IS NULL on every query.
 * ownerId is optional (supplied by service layer when caller is a sales_rep or
 * a manager/admin filtered by a specific rep).
 */
export async function getDealsReport(params: {
  organizationId: string
  startDate: Date
  endDate: Date
  ownerId?: string
}): Promise<DealsReportData> {
  const { organizationId, startDate, endDate, ownerId } = params

  // Won deals: filter by won_at within [startDate, endDate]
  const wonRows = await db
    .select({
      count: sql<number>`CAST(COUNT(${deals.id}) AS INTEGER)`,
      totalValue: sql<number>`COALESCE(SUM(CAST(${deals.value} AS NUMERIC)), 0)`,
    })
    .from(deals)
    .where(
      and(
        eq(deals.organizationId, organizationId),        // tenant isolation — always
        isNull(deals.deletedAt),                          // soft delete — always
        eq(deals.status, 'won'),
        gte(deals.wonAt, startDate),
        lte(deals.wonAt, endDate),
        ownerId ? eq(deals.ownerId, ownerId) : undefined,
      ),
    )

  // Lost deals: filter by lost_at within [startDate, endDate]
  const lostRows = await db
    .select({
      count: sql<number>`CAST(COUNT(${deals.id}) AS INTEGER)`,
      totalValue: sql<number>`COALESCE(SUM(CAST(${deals.value} AS NUMERIC)), 0)`,
    })
    .from(deals)
    .where(
      and(
        eq(deals.organizationId, organizationId),        // tenant isolation — always
        isNull(deals.deletedAt),                          // soft delete — always
        eq(deals.status, 'lost'),
        gte(deals.lostAt, startDate),
        lte(deals.lostAt, endDate),
        ownerId ? eq(deals.ownerId, ownerId) : undefined,
      ),
    )

  const won = wonRows[0] ?? { count: 0, totalValue: 0 }
  const lost = lostRows[0] ?? { count: 0, totalValue: 0 }

  return {
    won: {
      count: Number(won.count),
      totalValue: Number(won.totalValue),
    },
    lost: {
      count: Number(lost.count),
      totalValue: Number(lost.totalValue),
    },
    dateRange: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE VALUE REPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sum open deal values grouped by pipeline stage, ordered by display_order.
 * No date range — shows current open pipeline snapshot.
 * Scoped to organization_id + deleted_at IS NULL on both deals and stages.
 */
export async function getPipelineValueReport(params: {
  organizationId: string
  ownerId?: string
}): Promise<PipelineValueData> {
  const { organizationId, ownerId } = params

  const rows = await db
    .select({
      stageId: pipelineStages.id,
      stageName: pipelineStages.name,
      displayOrder: pipelineStages.displayOrder,
      dealCount: sql<number>`CAST(COUNT(${deals.id}) AS INTEGER)`,
      totalValue: sql<number>`COALESCE(SUM(CAST(${deals.value} AS NUMERIC)), 0)`,
    })
    .from(deals)
    .innerJoin(
      pipelineStages,
      and(
        eq(deals.stageId, pipelineStages.id),
        eq(pipelineStages.organizationId, organizationId), // tenant scope on joined table
        isNull(pipelineStages.deletedAt),                  // soft delete on joined table
      ),
    )
    .where(
      and(
        eq(deals.organizationId, organizationId),          // tenant isolation — always
        isNull(deals.deletedAt),                            // soft delete — always
        eq(deals.status, 'open'),
        ownerId ? eq(deals.ownerId, ownerId) : undefined,
      ),
    )
    .groupBy(pipelineStages.id, pipelineStages.name, pipelineStages.displayOrder)
    .orderBy(asc(pipelineStages.displayOrder))

  const grandTotal = rows.reduce((sum, row) => sum + Number(row.totalValue), 0)

  return {
    stages: rows.map((row) => ({
      stageId: row.stageId,
      stageName: row.stageName,
      dealCount: Number(row.dealCount),
      totalValue: Number(row.totalValue),
    })),
    grandTotal,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITIES REPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Count activities per rep broken down by type (call/email/meeting/demo/lunch/other).
 * Uses conditional COUNT pattern with CASE WHEN for each type column.
 * Scoped to organization_id + deleted_at IS NULL on every query.
 */
export async function getActivitiesReport(params: {
  organizationId: string
  startDate: Date
  endDate: Date
  ownerId?: string
}): Promise<ActivitiesReportData> {
  const { organizationId, startDate, endDate, ownerId } = params

  const rows = await db
    .select({
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      call: sql<number>`CAST(COUNT(CASE WHEN ${activities.type} = 'call' THEN 1 END) AS INTEGER)`,
      email: sql<number>`CAST(COUNT(CASE WHEN ${activities.type} = 'email' THEN 1 END) AS INTEGER)`,
      meeting: sql<number>`CAST(COUNT(CASE WHEN ${activities.type} = 'meeting' THEN 1 END) AS INTEGER)`,
      demo: sql<number>`CAST(COUNT(CASE WHEN ${activities.type} = 'demo' THEN 1 END) AS INTEGER)`,
      lunch: sql<number>`CAST(COUNT(CASE WHEN ${activities.type} = 'lunch' THEN 1 END) AS INTEGER)`,
      other: sql<number>`CAST(COUNT(CASE WHEN ${activities.type} = 'other' THEN 1 END) AS INTEGER)`,
      total: sql<number>`CAST(COUNT(${activities.id}) AS INTEGER)`,
    })
    .from(activities)
    .innerJoin(
      users,
      and(
        eq(activities.ownerId, users.id),
        eq(users.organizationId, organizationId), // tenant scope on joined table
        isNull(users.deletedAt),                   // soft delete on joined table
      ),
    )
    .where(
      and(
        eq(activities.organizationId, organizationId), // tenant isolation — always
        isNull(activities.deletedAt),                   // soft delete — always
        gte(activities.createdAt, startDate),
        lte(activities.createdAt, endDate),
        ownerId ? eq(activities.ownerId, ownerId) : undefined,
      ),
    )
    .groupBy(users.id, users.firstName, users.lastName)

  return {
    reps: rows.map((row) => ({
      userId: row.userId,
      name: [row.firstName, row.lastName].filter(Boolean).join(' '),
      call: Number(row.call),
      email: Number(row.email),
      meeting: Number(row.meeting),
      demo: Number(row.demo),
      lunch: Number(row.lunch),
      other: Number(row.other),
      total: Number(row.total),
    })),
    dateRange: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADS BY SOURCE REPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Count leads grouped by source enum value within a date range.
 * Scoped to organization_id + deleted_at IS NULL on every query.
 */
export async function getLeadsBySourceReport(params: {
  organizationId: string
  startDate: Date
  endDate: Date
  ownerId?: string
}): Promise<LeadsBySourceData> {
  const { organizationId, startDate, endDate, ownerId } = params

  const rows = await db
    .select({
      source: leads.source,
      count: sql<number>`CAST(COUNT(${leads.id}) AS INTEGER)`,
    })
    .from(leads)
    .where(
      and(
        eq(leads.organizationId, organizationId),   // tenant isolation — always
        isNull(leads.deletedAt),                     // soft delete — always
        gte(leads.createdAt, startDate),
        lte(leads.createdAt, endDate),
        ownerId ? eq(leads.ownerId, ownerId) : undefined,
      ),
    )
    .groupBy(leads.source)

  return {
    sources: rows
      .filter((row) => row.source !== null)
      .map((row) => ({
        source: row.source as string,
        count: Number(row.count),
      })),
    dateRange: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER OWNERSHIP VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify that a given user ID exists within the organization.
 * Used by service layer to validate the ownerId query param before querying.
 */
export async function findUserInOrg(
  organizationId: string,
  userId: string,
): Promise<{ id: string } | undefined> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.organizationId, organizationId), // tenant isolation — always
        isNull(users.deletedAt),                   // soft delete — always
      ),
    )
    .limit(1)
  return row
}
