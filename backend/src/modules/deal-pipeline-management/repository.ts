import { and, asc, count, desc, eq, ilike, isNull, sql } from 'drizzle-orm'
import { db } from '../../db'
import { deals, Deal, NewDeal } from '../../db/schema/deals'
import { pipelineStages, PipelineStage, NewPipelineStage } from '../../db/schema/pipeline-stages'
import { pipelines, Pipeline, NewPipeline } from '../../db/schema/pipelines'
import { dealStageHistory, DealStageHistory, NewDealStageHistory } from '../../db/schema/deal-stage-history'
import { users } from '../../db/schema/users'
import { buildOffset } from '../../lib/pagination'
import type { ListDealsQuery } from './schemas'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DealRow = Deal & { ownerName: string }

// ─────────────────────────────────────────────────────────────────────────────
// DEALS
// ─────────────────────────────────────────────────────────────────────────────

const dealEnrichedFields = {
  id: deals.id,
  organizationId: deals.organizationId,
  title: deals.title,
  value: deals.value,
  status: deals.status,
  stageId: deals.stageId,
  ownerId: deals.ownerId,
  contactId: deals.contactId,
  companyId: deals.companyId,
  leadId: deals.leadId,
  expectedCloseDate: deals.expectedCloseDate,
  wonAt: deals.wonAt,
  lostAt: deals.lostAt,
  lostReason: deals.lostReason,
  createdAt: deals.createdAt,
  updatedAt: deals.updatedAt,
  deletedAt: deals.deletedAt,
  ownerName: sql<string>`TRIM(COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, ''))`,
}

// ─── findManyDeals ───────────────────────────────────────────────────────────

export async function findManyDeals(
  organizationId: string,
  filters: ListDealsQuery & { statusList?: string[] },
): Promise<{ data: DealRow[]; total: number }> {
  const statusList: string[] =
    filters.statusList ??
    (filters.status ? filters.status.split(',').map((s) => s.trim()).filter(Boolean) : ['open'])

  const where = and(
    eq(deals.organizationId, organizationId),
    isNull(deals.deletedAt),
    statusList.length > 0
      ? sql`${deals.status} = ANY(${sql.raw(`ARRAY[${statusList.map((s) => `'${s}'`).join(',')}]::deal_status[]`)})`
      : undefined,
    filters.ownerId ? eq(deals.ownerId, filters.ownerId) : undefined,
    filters.stageId ? eq(deals.stageId, filters.stageId) : undefined,
    filters.search ? ilike(deals.title, `%${filters.search}%`) : undefined,
  )

  const offset = buildOffset(filters)
  const orderFn = filters.order === 'asc' ? asc : desc

  const sortCol =
    filters.sort === 'title'
      ? deals.title
      : filters.sort === 'value'
        ? deals.value
        : filters.sort === 'expected_close_date'
          ? deals.expectedCloseDate
          : deals.createdAt

  const [data, [{ total }]] = await Promise.all([
    db
      .select(dealEnrichedFields)
      .from(deals)
      .leftJoin(users, eq(deals.ownerId, users.id))
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(filters.limit)
      .offset(offset),
    db.select({ total: count() }).from(deals).where(where),
  ])

  return { data: data as DealRow[], total }
}

// ─── findDealById ─────────────────────────────────────────────────────────────

export async function findDealById(
  organizationId: string,
  id: string,
): Promise<DealRow | undefined> {
  const [row] = await db
    .select(dealEnrichedFields)
    .from(deals)
    .leftJoin(users, eq(deals.ownerId, users.id))
    .where(
      and(
        eq(deals.id, id),
        eq(deals.organizationId, organizationId),
        isNull(deals.deletedAt),
      ),
    )
    .limit(1)
  return row as DealRow | undefined
}

// ─── createDeal ───────────────────────────────────────────────────────────────

export async function createDeal(data: NewDeal): Promise<Deal> {
  const [deal] = await db.insert(deals).values(data).returning()
  return deal
}

// ─── updateDeal ───────────────────────────────────────────────────────────────

export async function updateDeal(
  organizationId: string,
  id: string,
  data: Partial<Omit<Deal, 'id' | 'organizationId' | 'createdAt'>>,
): Promise<Deal | undefined> {
  const [updated] = await db
    .update(deals)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(deals.id, id),
        eq(deals.organizationId, organizationId),
        isNull(deals.deletedAt),
      ),
    )
    .returning()
  return updated
}

// ─── softDeleteDeal ───────────────────────────────────────────────────────────
// Never issues DELETE FROM — sets deleted_at = NOW() (soft delete).

export async function softDeleteDeal(organizationId: string, id: string): Promise<void> {
  await db
    .update(deals)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(deals.id, id),
        eq(deals.organizationId, organizationId),
        isNull(deals.deletedAt),
      ),
    )
}

// ─── markDealWon ─────────────────────────────────────────────────────────────

export async function markDealWon(organizationId: string, id: string): Promise<Deal | undefined> {
  const [updated] = await db
    .update(deals)
    .set({ status: 'won', wonAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(deals.id, id),
        eq(deals.organizationId, organizationId),
        isNull(deals.deletedAt),
      ),
    )
    .returning()
  return updated
}

// ─── markDealLost ────────────────────────────────────────────────────────────

export async function markDealLost(
  organizationId: string,
  id: string,
  lostReason: string,
): Promise<Deal | undefined> {
  const [updated] = await db
    .update(deals)
    .set({ status: 'lost', lostAt: new Date(), lostReason, updatedAt: new Date() })
    .where(
      and(
        eq(deals.id, id),
        eq(deals.organizationId, organizationId),
        isNull(deals.deletedAt),
      ),
    )
    .returning()
  return updated
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE STAGES
// ─────────────────────────────────────────────────────────────────────────────

// ─── findAllStages ────────────────────────────────────────────────────────────

export async function findAllStages(organizationId: string): Promise<PipelineStage[]> {
  return db
    .select()
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.organizationId, organizationId),
        isNull(pipelineStages.deletedAt),
      ),
    )
    .orderBy(asc(pipelineStages.displayOrder))
}

// ─── findStageById ───────────────────────────────────────────────────────────

export async function findStageById(
  organizationId: string,
  id: string,
): Promise<PipelineStage | undefined> {
  const [stage] = await db
    .select()
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.id, id),
        eq(pipelineStages.organizationId, organizationId),
        isNull(pipelineStages.deletedAt),
      ),
    )
    .limit(1)
  return stage
}

// ─── createStage ─────────────────────────────────────────────────────────────

export async function createStage(data: NewPipelineStage): Promise<PipelineStage> {
  const [stage] = await db.insert(pipelineStages).values(data).returning()
  return stage
}

// ─── updateStage ─────────────────────────────────────────────────────────────

export async function updateStage(
  organizationId: string,
  id: string,
  data: Partial<Omit<PipelineStage, 'id' | 'organizationId' | 'pipelineId' | 'createdAt'>>,
): Promise<PipelineStage | undefined> {
  const [updated] = await db
    .update(pipelineStages)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(pipelineStages.id, id),
        eq(pipelineStages.organizationId, organizationId),
        isNull(pipelineStages.deletedAt),
      ),
    )
    .returning()
  return updated
}

// ─── softDeleteStage ─────────────────────────────────────────────────────────
// Never issues DELETE FROM — sets deleted_at = NOW() (soft delete).

export async function softDeleteStage(organizationId: string, id: string): Promise<void> {
  await db
    .update(pipelineStages)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(pipelineStages.id, id),
        eq(pipelineStages.organizationId, organizationId),
        isNull(pipelineStages.deletedAt),
      ),
    )
}

// ─── reorderStages ───────────────────────────────────────────────────────────
// Updates displayOrder for each stage individually (bulk UPDATE via Promise.all).

export async function reorderStages(
  organizationId: string,
  stages: Array<{ id: string; displayOrder: number }>,
): Promise<void> {
  await Promise.all(
    stages.map(({ id, displayOrder }) =>
      db
        .update(pipelineStages)
        .set({ displayOrder, updatedAt: new Date() })
        .where(
          and(
            eq(pipelineStages.id, id),
            eq(pipelineStages.organizationId, organizationId),
            isNull(pipelineStages.deletedAt),
          ),
        ),
    ),
  )
}

// ─── countOpenDealsInStage ───────────────────────────────────────────────────

export async function countOpenDealsInStage(
  organizationId: string,
  stageId: string,
): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(deals)
    .where(
      and(
        eq(deals.organizationId, organizationId),
        eq(deals.stageId, stageId),
        eq(deals.status, 'open'),
        isNull(deals.deletedAt),
      ),
    )
  return total
}

// ─── countAllStages ──────────────────────────────────────────────────────────

export async function countAllStages(organizationId: string): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.organizationId, organizationId),
        isNull(pipelineStages.deletedAt),
      ),
    )
  return total
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE HISTORY
// ─────────────────────────────────────────────────────────────────────────────

// ─── appendStageHistory ──────────────────────────────────────────────────────
// Append-only insert — no returning needed (BR-07).

export async function appendStageHistory(data: NewDealStageHistory): Promise<void> {
  await db.insert(dealStageHistory).values(data)
}

// ─── findStageHistoryByDeal ──────────────────────────────────────────────────
// No deletedAt filter — this table has no soft delete (append-only, BR-07).

export async function findStageHistoryByDeal(
  dealId: string,
  organizationId: string,
): Promise<DealStageHistory[]> {
  return db
    .select()
    .from(dealStageHistory)
    .where(
      and(
        eq(dealStageHistory.dealId, dealId),
        eq(dealStageHistory.organizationId, organizationId),
      ),
    )
    .orderBy(asc(dealStageHistory.movedAt))
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINES
// ─────────────────────────────────────────────────────────────────────────────

// ─── findOrCreateDefaultPipeline ─────────────────────────────────────────────
// Returns the default pipeline for the org, creating one if it does not exist.

export async function findOrCreateDefaultPipeline(organizationId: string): Promise<Pipeline> {
  const [existing] = await db
    .select()
    .from(pipelines)
    .where(
      and(
        eq(pipelines.organizationId, organizationId),
        eq(pipelines.isDefault, true),
      ),
    )
    .limit(1)

  if (existing) return existing

  const newPipeline: NewPipeline = {
    organizationId,
    name: 'Sales Pipeline',
    isDefault: true,
  }

  const [created] = await db.insert(pipelines).values(newPipeline).returning()
  return created
}

// ─── seedDefaultStages ────────────────────────────────────────────────────────
// Inserts the 5 standard stages for a newly-created pipeline.

const DEFAULT_STAGES = [
  { name: 'Prospecting',   displayOrder: 1, probability: 10 },
  { name: 'Qualification', displayOrder: 2, probability: 25 },
  { name: 'Proposal',      displayOrder: 3, probability: 50 },
  { name: 'Negotiation',   displayOrder: 4, probability: 75 },
  { name: 'Closed Won',    displayOrder: 5, probability: 100 },
]

export async function seedDefaultStages(
  organizationId: string,
  pipelineId: string,
): Promise<PipelineStage[]> {
  const values: NewPipelineStage[] = DEFAULT_STAGES.map((s) => ({
    organizationId,
    pipelineId,
    name: s.name,
    displayOrder: s.displayOrder,
    probability: s.probability,
  }))
  return db.insert(pipelineStages).values(values).returning()
}
