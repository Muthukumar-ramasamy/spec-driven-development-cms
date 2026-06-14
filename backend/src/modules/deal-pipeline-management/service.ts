import { ForbiddenError, NotFoundError, UnprocessableError } from '../../lib/errors'
import { JWTPayload } from '../../lib/auth'
import { buildPaginationMeta } from '../../lib/pagination'
import * as repo from './repository'
import type {
  CreateDealInput,
  UpdateDealInput,
  MarkLostInput,
  ListDealsQuery,
  CreateStageInput,
  UpdateStageInput,
  ReorderStagesInput,
} from './schemas'

// ─────────────────────────────────────────────────────────────────────────────
// DEALS
// ─────────────────────────────────────────────────────────────────────────────

// ─── listDeals ────────────────────────────────────────────────────────────────
// BR-03: Sales reps always see only their own deals (ownerId forced to caller.sub).
// AC-04: Default status filter is 'open' — won/lost deals are hidden from the board.

export async function listDeals(caller: JWTPayload, query: ListDealsQuery) {
  // BR-03: Force ownerId for sales_rep — they cannot see other reps' deals
  const effectiveOwnerId =
    caller.role === 'sales_rep' ? caller.sub : (query.ownerId ?? undefined)

  const statusList: string[] = query.status
    ? query.status.split(',').map((s) => s.trim()).filter(Boolean)
    : ['open']

  const { data, total } = await repo.findManyDeals(caller.organizationId, {
    ...query,
    ownerId: effectiveOwnerId,
    statusList,
  })

  const pagination = buildPaginationMeta({ page: query.page, limit: query.limit }, total)
  return { data, pagination }
}

// ─── createDeal ───────────────────────────────────────────────────────────────
// AC-01: owner_id = submitting user for sales_rep; admin/manager may specify.
// BR-01: stageId is required — enforced by Zod schema before reaching here.
// BR-07: Initial stage history entry created with fromStageId = null.

export async function createDeal(caller: JWTPayload, input: CreateDealInput) {
  // Ownership: sales_rep is always the owner; admin/manager may specify or defaults to self
  const ownerId =
    caller.role === 'sales_rep' ? caller.sub : (input.ownerId ?? caller.sub)

  // Ensure the org's default pipeline exists (creates one if not present)
  await repo.findOrCreateDefaultPipeline(caller.organizationId)

  const deal = await repo.createDeal({
    organizationId: caller.organizationId,
    title: input.title,
    value: input.value !== undefined ? String(input.value) : '0',
    status: 'open',
    stageId: input.stageId,
    ownerId,
    contactId: input.contactId ?? null,
    companyId: input.companyId ?? null,
    expectedCloseDate: input.expectedCloseDate ?? null,
  })

  // BR-07: Append the initial stage history entry (fromStageId = null on creation)
  await repo.appendStageHistory({
    dealId: deal.id,
    organizationId: caller.organizationId,
    fromStageId: null,
    toStageId: input.stageId,
    movedBy: caller.sub,
    movedAt: new Date(),
  })

  return deal
}

// ─── getDealById ──────────────────────────────────────────────────────────────
// BR-03: Sales rep can only view their own deals.

export async function getDealById(caller: JWTPayload, id: string) {
  const deal = await repo.findDealById(caller.organizationId, id)
  if (!deal) throw new NotFoundError('Deal')

  // BR-03: sales_rep cannot view another rep's deal
  if (caller.role === 'sales_rep' && deal.ownerId !== caller.sub) {
    throw new ForbiddenError('You do not have permission to view this deal.')
  }

  // Fetch stage history for this deal (append-only, no deletedAt filter)
  const stageHistory = await repo.findStageHistoryByDeal(id, caller.organizationId)

  return { ...deal, stageHistory }
}

// ─── updateDeal ───────────────────────────────────────────────────────────────
// BR-03: sales_rep can only update their own deals.
// AC-07: If stageId changes, append a stage history record.
// Permissions matrix: sales_rep cannot reassign ownerId.

export async function updateDeal(
  caller: JWTPayload,
  id: string,
  input: UpdateDealInput,
) {
  const deal = await repo.findDealById(caller.organizationId, id)
  if (!deal) throw new NotFoundError('Deal')

  // BR-03: sales_rep can only update their own deal
  if (caller.role === 'sales_rep' && deal.ownerId !== caller.sub) {
    throw new ForbiddenError('You do not have permission to edit this deal.')
  }

  // Permissions matrix: sales_rep cannot reassign ownership
  if (caller.role === 'sales_rep' && input.ownerId !== undefined) {
    throw new ForbiddenError('You do not have permission to reassign deal ownership.')
  }

  const previousStageId = deal.stageId
  const stageChanging = input.stageId !== undefined && input.stageId !== previousStageId

  // Build partial update payload — include only provided fields
  const updates: Parameters<typeof repo.updateDeal>[2] = {}
  if (input.title !== undefined) updates.title = input.title
  if ('value' in input) {
    updates.value = input.value !== null && input.value !== undefined ? String(input.value) : null
  }
  if (input.stageId !== undefined) updates.stageId = input.stageId
  if (input.ownerId !== undefined) updates.ownerId = input.ownerId
  if ('contactId' in input) updates.contactId = input.contactId ?? null
  if ('companyId' in input) updates.companyId = input.companyId ?? null
  if ('expectedCloseDate' in input) updates.expectedCloseDate = input.expectedCloseDate ?? null

  const updated = await repo.updateDeal(caller.organizationId, id, updates)
  if (!updated) throw new NotFoundError('Deal')

  // AC-07: Append stage history if stage changed
  if (stageChanging) {
    await repo.appendStageHistory({
      dealId: id,
      organizationId: caller.organizationId,
      fromStageId: previousStageId,
      toStageId: input.stageId!,
      movedBy: caller.sub,
      movedAt: new Date(),
    })
  }

  return updated
}

// ─── deleteDeal ───────────────────────────────────────────────────────────────
// Permissions matrix: admin only.

export async function deleteDeal(caller: JWTPayload, id: string) {
  if (caller.role !== 'admin') {
    throw new ForbiddenError('Only admins can delete deals.')
  }

  const deal = await repo.findDealById(caller.organizationId, id)
  if (!deal) throw new NotFoundError('Deal')

  await repo.softDeleteDeal(caller.organizationId, id)
}

// ─── markDealWon ─────────────────────────────────────────────────────────────
// AC-05: Sets status = 'won', won_at = NOW().
// BR-03: sales_rep can only mark their own deal won.

export async function markDealWon(caller: JWTPayload, id: string) {
  const deal = await repo.findDealById(caller.organizationId, id)
  if (!deal) throw new NotFoundError('Deal')

  // BR-03: sales_rep can only act on their own deals
  if (caller.role === 'sales_rep' && deal.ownerId !== caller.sub) {
    throw new ForbiddenError('You do not have permission to update this deal.')
  }

  const updated = await repo.markDealWon(caller.organizationId, id)
  if (!updated) throw new NotFoundError('Deal')

  return updated
}

// ─── markDealLost ────────────────────────────────────────────────────────────
// AC-06: lostReason is required — enforced by markLostSchema (Zod) before here.
// BR-02: Double-enforced in service: lostReason must be non-empty.
// BR-03: sales_rep can only mark their own deal lost.

export async function markDealLost(caller: JWTPayload, id: string, input: MarkLostInput) {
  const deal = await repo.findDealById(caller.organizationId, id)
  if (!deal) throw new NotFoundError('Deal')

  // BR-03: sales_rep can only act on their own deals
  if (caller.role === 'sales_rep' && deal.ownerId !== caller.sub) {
    throw new ForbiddenError('You do not have permission to update this deal.')
  }

  // BR-02: lostReason must be non-empty (belt-and-suspenders beyond Zod)
  if (!input.lostReason || input.lostReason.trim().length === 0) {
    throw new UnprocessableError('Lost reason is required.')
  }

  const updated = await repo.markDealLost(caller.organizationId, id, input.lostReason)
  if (!updated) throw new NotFoundError('Deal')

  return updated
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE STAGES
// ─────────────────────────────────────────────────────────────────────────────

// ─── listStages ──────────────────────────────────────────────────────────────

export async function listStages(caller: JWTPayload) {
  const stages = await repo.findAllStages(caller.organizationId)
  if (stages.length > 0) return stages

  // No stages exist yet — ensure pipeline exists and seed the 5 default stages
  const pipeline = await repo.findOrCreateDefaultPipeline(caller.organizationId)
  return repo.seedDefaultStages(caller.organizationId, pipeline.id)
}

// ─── createStage ─────────────────────────────────────────────────────────────
// Permissions matrix: admin only.

export async function createStage(caller: JWTPayload, input: CreateStageInput) {
  if (caller.role !== 'admin') {
    throw new ForbiddenError('Only admins can manage pipeline stages.')
  }

  // Ensure the org's default pipeline exists
  const pipeline = await repo.findOrCreateDefaultPipeline(caller.organizationId)

  const stage = await repo.createStage({
    pipelineId: pipeline.id,
    organizationId: caller.organizationId,
    name: input.name,
    displayOrder: input.displayOrder,
    probability: input.probability ?? 0,
  })

  return stage
}

// ─── updateStage ─────────────────────────────────────────────────────────────
// Permissions matrix: admin only.

export async function updateStage(caller: JWTPayload, id: string, input: UpdateStageInput) {
  if (caller.role !== 'admin') {
    throw new ForbiddenError('Only admins can manage pipeline stages.')
  }

  const stage = await repo.findStageById(caller.organizationId, id)
  if (!stage) throw new NotFoundError('Pipeline stage')

  const updates: Parameters<typeof repo.updateStage>[2] = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.probability !== undefined) updates.probability = input.probability

  const updated = await repo.updateStage(caller.organizationId, id, updates)
  if (!updated) throw new NotFoundError('Pipeline stage')

  return updated
}

// ─── deleteStage ─────────────────────────────────────────────────────────────
// Permissions matrix: admin only.
// BR-04: Blocked if stage has open deals.
// BR-05: Blocked if it is the last remaining stage.

export async function deleteStage(caller: JWTPayload, id: string) {
  if (caller.role !== 'admin') {
    throw new ForbiddenError('Only admins can manage pipeline stages.')
  }

  const stage = await repo.findStageById(caller.organizationId, id)
  if (!stage) throw new NotFoundError('Pipeline stage')

  // BR-04: Cannot delete a stage that has open deals
  const openDealCount = await repo.countOpenDealsInStage(caller.organizationId, id)
  if (openDealCount > 0) {
    throw new UnprocessableError(
      'Cannot delete a stage with open deals. Move or close them first.',
    )
  }

  // BR-05: There must always be at least one stage
  const totalStages = await repo.countAllStages(caller.organizationId)
  if (totalStages <= 1) {
    throw new UnprocessableError('The pipeline must have at least one stage.')
  }

  await repo.softDeleteStage(caller.organizationId, id)
}

// ─── reorderStages ───────────────────────────────────────────────────────────
// Permissions matrix: admin only.
// AC-09: Persists the new stage order and returns the updated list.

export async function reorderStages(caller: JWTPayload, input: ReorderStagesInput) {
  if (caller.role !== 'admin') {
    throw new ForbiddenError('Only admins can manage pipeline stages.')
  }

  await repo.reorderStages(caller.organizationId, input.stages)

  // Return the full updated stage list in new order
  return repo.findAllStages(caller.organizationId)
}
