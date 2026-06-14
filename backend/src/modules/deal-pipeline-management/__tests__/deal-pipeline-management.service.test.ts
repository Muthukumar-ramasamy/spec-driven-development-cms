import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ForbiddenError, NotFoundError, UnprocessableError } from '../../../lib/errors'
import * as service from '../service'
import * as repo from '../repository'

vi.mock('../repository')

// ─── Caller factories ────────────────────────────────────────────────────────

const makeAdmin = (overrides = {}) => ({
  sub: 'admin-id',
  organizationId: 'org-id',
  role: 'admin' as const,
  ...overrides,
})

const makeManager = (overrides = {}) => ({
  sub: 'manager-id',
  organizationId: 'org-id',
  role: 'manager' as const,
  ...overrides,
})

const makeSalesRep = (overrides = {}) => ({
  sub: 'rep-id',
  organizationId: 'org-id',
  role: 'sales_rep' as const,
  ...overrides,
})

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockStage = {
  id: 'stage-id',
  organizationId: 'org-id',
  pipelineId: 'pipeline-id',
  name: 'Prospecting',
  displayOrder: 1,
  probability: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

const mockDeal = {
  id: 'deal-id',
  organizationId: 'org-id',
  title: 'Big Deal',
  value: '5000',
  status: 'open' as const,
  stageId: 'stage-id',
  ownerId: 'rep-id',
  contactId: null,
  companyId: null,
  leadId: null,
  expectedCloseDate: null,
  wonAt: null,
  lostAt: null,
  lostReason: null,
  ownerName: 'Test Rep',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

const mockPipeline = {
  id: 'pipeline-id',
  organizationId: 'org-id',
  name: 'Sales Pipeline',
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

const baseListQuery = {
  page: 1,
  limit: 20,
  sort: 'created_at' as const,
  order: 'desc' as const,
  status: 'open',
}

// ─────────────────────────────────────────────────────────────────────────────
// listDeals
// ─────────────────────────────────────────────────────────────────────────────

describe('dealService.listDeals', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deal-unit-01: returns open deals with pagination meta', async () => {
    // Arrange
    vi.mocked(repo.findManyDeals).mockResolvedValue({ data: [mockDeal], total: 1 })
    const caller = makeAdmin()

    // Act
    const result = await service.listDeals(caller, baseListQuery)

    // Assert
    expect(result.data).toHaveLength(1)
    expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 1 })
  })

  it('deal-unit-02: sales rep ownerId forced to caller.sub (BR-03)', async () => {
    // Arrange
    vi.mocked(repo.findManyDeals).mockResolvedValue({ data: [], total: 0 })
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act
    await service.listDeals(caller, { ...baseListQuery, ownerId: 'some-other-id' })

    // Assert — ownerId must be forced to caller.sub
    expect(repo.findManyDeals).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({ ownerId: 'rep-id' }),
    )
  })

  it('deal-unit-03: manager can filter by any ownerId (not forced)', async () => {
    // Arrange
    vi.mocked(repo.findManyDeals).mockResolvedValue({ data: [], total: 0 })
    const caller = makeManager()

    // Act
    await service.listDeals(caller, { ...baseListQuery, ownerId: 'rep-id' })

    // Assert
    expect(repo.findManyDeals).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({ ownerId: 'rep-id' }),
    )
  })

  it('deal-unit-04: default status filter is open — won/lost hidden from board (AC-04)', async () => {
    // Arrange
    vi.mocked(repo.findManyDeals).mockResolvedValue({ data: [], total: 0 })
    const caller = makeAdmin()

    // Act
    await service.listDeals(caller, { ...baseListQuery, status: 'open' })

    // Assert
    expect(repo.findManyDeals).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({ statusList: ['open'] }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createDeal
// ─────────────────────────────────────────────────────────────────────────────

describe('dealService.createDeal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deal-unit-05: creates deal with status=open, owner=caller for sales_rep (AC-01, BR-01)', async () => {
    // Arrange
    vi.mocked(repo.findOrCreateDefaultPipeline).mockResolvedValue(mockPipeline)
    vi.mocked(repo.createDeal).mockResolvedValue(mockDeal)
    vi.mocked(repo.appendStageHistory).mockResolvedValue(undefined)
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act
    const result = await service.createDeal(caller, {
      title: 'Big Deal',
      stageId: 'stage-id',
    })

    // Assert
    expect(result.status).toBe('open')
    expect(repo.createDeal).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'rep-id', status: 'open' }),
    )
  })

  it('deal-unit-06: deal value defaults to "0" when not provided (BR-06)', async () => {
    // Arrange
    vi.mocked(repo.findOrCreateDefaultPipeline).mockResolvedValue(mockPipeline)
    vi.mocked(repo.createDeal).mockResolvedValue(mockDeal)
    vi.mocked(repo.appendStageHistory).mockResolvedValue(undefined)
    const caller = makeSalesRep()

    // Act
    await service.createDeal(caller, { title: 'Deal No Value', stageId: 'stage-id' })

    // Assert
    expect(repo.createDeal).toHaveBeenCalledWith(
      expect.objectContaining({ value: '0' }),
    )
  })

  it('deal-unit-07: appends initial stage history with fromStageId=null on creation (BR-07, AC-07)', async () => {
    // Arrange
    vi.mocked(repo.findOrCreateDefaultPipeline).mockResolvedValue(mockPipeline)
    vi.mocked(repo.createDeal).mockResolvedValue(mockDeal)
    vi.mocked(repo.appendStageHistory).mockResolvedValue(undefined)
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act
    await service.createDeal(caller, { title: 'New Deal', stageId: 'stage-id' })

    // Assert
    expect(repo.appendStageHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        dealId: 'deal-id',
        fromStageId: null,
        toStageId: 'stage-id',
        movedBy: 'rep-id',
      }),
    )
  })

  it('deal-unit-08: admin/manager may supply ownerId; sales_rep ownerId always forced to sub', async () => {
    // Arrange
    vi.mocked(repo.findOrCreateDefaultPipeline).mockResolvedValue(mockPipeline)
    vi.mocked(repo.createDeal).mockResolvedValue({ ...mockDeal, ownerId: 'other-rep-id' })
    vi.mocked(repo.appendStageHistory).mockResolvedValue(undefined)
    const caller = makeAdmin({ sub: 'admin-id' })

    // Act
    await service.createDeal(caller, {
      title: 'Admin Created Deal',
      stageId: 'stage-id',
      ownerId: 'other-rep-id',
    })

    // Assert
    expect(repo.createDeal).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'other-rep-id' }),
    )
  })

  it('deal-unit-09: sales_rep ownerId cannot be overridden even if supplied', async () => {
    // Arrange
    vi.mocked(repo.findOrCreateDefaultPipeline).mockResolvedValue(mockPipeline)
    vi.mocked(repo.createDeal).mockResolvedValue(mockDeal)
    vi.mocked(repo.appendStageHistory).mockResolvedValue(undefined)
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act
    await service.createDeal(caller, {
      title: 'Self Deal',
      stageId: 'stage-id',
      ownerId: 'hacker-id',
    })

    // Assert — ownerId forced to rep-id, not hacker-id
    expect(repo.createDeal).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'rep-id' }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getDealById
// ─────────────────────────────────────────────────────────────────────────────

describe('dealService.getDealById', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deal-unit-10: returns deal with stage history for admin', async () => {
    // Arrange
    const history = [{ id: 'h-1', dealId: 'deal-id', fromStageId: null, toStageId: 'stage-id', movedBy: 'rep-id', movedAt: new Date(), organizationId: 'org-id' }]
    vi.mocked(repo.findDealById).mockResolvedValue(mockDeal)
    vi.mocked(repo.findStageHistoryByDeal).mockResolvedValue(history)
    const caller = makeAdmin()

    // Act
    const result = await service.getDealById(caller, 'deal-id')

    // Assert
    expect(result.stageHistory).toHaveLength(1)
    expect(result.title).toBe('Big Deal')
  })

  it('deal-unit-11: throws NotFoundError when deal not found', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(service.getDealById(caller, 'no-such-id')).rejects.toThrow(NotFoundError)
  })

  it('deal-unit-12: sales rep cannot view a deal they do not own (BR-03)', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue({ ...mockDeal, ownerId: 'other-rep-id' })
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act & Assert
    await expect(service.getDealById(caller, 'deal-id')).rejects.toThrow(ForbiddenError)
  })

  it('deal-unit-13: sales rep can view their own deal', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue({ ...mockDeal, ownerId: 'rep-id' })
    vi.mocked(repo.findStageHistoryByDeal).mockResolvedValue([])
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act
    const result = await service.getDealById(caller, 'deal-id')

    // Assert
    expect(result.id).toBe('deal-id')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateDeal
// ─────────────────────────────────────────────────────────────────────────────

describe('dealService.updateDeal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deal-unit-14: sales rep can update their own deal', async () => {
    // Arrange
    const updated = { ...mockDeal, title: 'Updated Deal' }
    vi.mocked(repo.findDealById).mockResolvedValue(mockDeal)
    vi.mocked(repo.updateDeal).mockResolvedValue(updated)
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act
    const result = await service.updateDeal(caller, 'deal-id', { title: 'Updated Deal' })

    // Assert
    expect(result?.title).toBe('Updated Deal')
  })

  it('deal-unit-15: sales rep cannot edit another reps deal — throws ForbiddenError', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue({ ...mockDeal, ownerId: 'other-rep-id' })
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act & Assert
    await expect(
      service.updateDeal(caller, 'deal-id', { title: 'Hacked' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('deal-unit-16: sales rep cannot reassign ownerId — throws ForbiddenError', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue(mockDeal)
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act & Assert
    await expect(
      service.updateDeal(caller, 'deal-id', { ownerId: 'other-user-id' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('deal-unit-17: stage change appends stage history record (AC-07, BR-07)', async () => {
    // Arrange
    const updated = { ...mockDeal, stageId: 'new-stage-id' }
    vi.mocked(repo.findDealById).mockResolvedValue(mockDeal)
    vi.mocked(repo.updateDeal).mockResolvedValue(updated)
    vi.mocked(repo.appendStageHistory).mockResolvedValue(undefined)
    const caller = makeAdmin({ sub: 'admin-id' })

    // Act
    await service.updateDeal(caller, 'deal-id', { stageId: 'new-stage-id' })

    // Assert
    expect(repo.appendStageHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        dealId: 'deal-id',
        fromStageId: 'stage-id',
        toStageId: 'new-stage-id',
        movedBy: 'admin-id',
      }),
    )
  })

  it('deal-unit-18: no stage history appended when stage does not change', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue(mockDeal)
    vi.mocked(repo.updateDeal).mockResolvedValue({ ...mockDeal, title: 'New Title' })
    const caller = makeAdmin()

    // Act
    await service.updateDeal(caller, 'deal-id', { title: 'New Title' })

    // Assert
    expect(repo.appendStageHistory).not.toHaveBeenCalled()
  })

  it('deal-unit-19: throws NotFoundError when deal does not exist', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(
      service.updateDeal(caller, 'no-such-id', { title: 'Ghost' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('deal-unit-20: manager can edit any deal in the org (edit any deal permission)', async () => {
    // Arrange
    const updated = { ...mockDeal, title: 'Manager Updated' }
    vi.mocked(repo.findDealById).mockResolvedValue({ ...mockDeal, ownerId: 'rep-id' })
    vi.mocked(repo.updateDeal).mockResolvedValue(updated)
    const caller = makeManager({ sub: 'manager-id' })

    // Act
    const result = await service.updateDeal(caller, 'deal-id', { title: 'Manager Updated' })

    // Assert
    expect(result?.title).toBe('Manager Updated')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// deleteDeal
// ─────────────────────────────────────────────────────────────────────────────

describe('dealService.deleteDeal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deal-unit-21: admin can soft-delete a deal', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue(mockDeal)
    vi.mocked(repo.softDeleteDeal).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act
    await service.deleteDeal(caller, 'deal-id')

    // Assert
    expect(repo.softDeleteDeal).toHaveBeenCalledWith('org-id', 'deal-id')
  })

  it('deal-unit-22: manager cannot delete a deal — throws ForbiddenError', async () => {
    // Arrange
    const caller = makeManager()

    // Act & Assert
    await expect(service.deleteDeal(caller, 'deal-id')).rejects.toThrow(ForbiddenError)
    expect(repo.softDeleteDeal).not.toHaveBeenCalled()
  })

  it('deal-unit-23: sales rep cannot delete a deal — throws ForbiddenError', async () => {
    // Arrange
    const caller = makeSalesRep()

    // Act & Assert
    await expect(service.deleteDeal(caller, 'deal-id')).rejects.toThrow(ForbiddenError)
    expect(repo.softDeleteDeal).not.toHaveBeenCalled()
  })

  it('deal-unit-24: throws NotFoundError when deal does not exist', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(service.deleteDeal(caller, 'no-such-id')).rejects.toThrow(NotFoundError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// markDealWon
// ─────────────────────────────────────────────────────────────────────────────

describe('dealService.markDealWon', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deal-unit-25: sets status=won and wonAt (AC-05)', async () => {
    // Arrange
    const wonDeal = { ...mockDeal, status: 'won' as const, wonAt: new Date() }
    vi.mocked(repo.findDealById).mockResolvedValue(mockDeal)
    vi.mocked(repo.markDealWon).mockResolvedValue(wonDeal)
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act
    const result = await service.markDealWon(caller, 'deal-id')

    // Assert
    expect(result.status).toBe('won')
    expect(result.wonAt).not.toBeNull()
  })

  it('deal-unit-26: sales rep cannot mark another reps deal won — throws ForbiddenError (BR-03)', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue({ ...mockDeal, ownerId: 'other-rep-id' })
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act & Assert
    await expect(service.markDealWon(caller, 'deal-id')).rejects.toThrow(ForbiddenError)
  })

  it('deal-unit-27: manager can mark any deal won', async () => {
    // Arrange
    const wonDeal = { ...mockDeal, status: 'won' as const, wonAt: new Date() }
    vi.mocked(repo.findDealById).mockResolvedValue({ ...mockDeal, ownerId: 'rep-id' })
    vi.mocked(repo.markDealWon).mockResolvedValue(wonDeal)
    const caller = makeManager()

    // Act
    const result = await service.markDealWon(caller, 'deal-id')

    // Assert
    expect(result.status).toBe('won')
  })

  it('deal-unit-28: throws NotFoundError when deal does not exist', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(service.markDealWon(caller, 'no-such-id')).rejects.toThrow(NotFoundError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// markDealLost
// ─────────────────────────────────────────────────────────────────────────────

describe('dealService.markDealLost', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deal-unit-29: sets status=lost, lostAt, and lostReason (AC-06)', async () => {
    // Arrange
    const lostDeal = {
      ...mockDeal,
      status: 'lost' as const,
      lostAt: new Date(),
      lostReason: 'Budget cut',
    }
    vi.mocked(repo.findDealById).mockResolvedValue(mockDeal)
    vi.mocked(repo.markDealLost).mockResolvedValue(lostDeal)
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act
    const result = await service.markDealLost(caller, 'deal-id', { lostReason: 'Budget cut' })

    // Assert
    expect(result.status).toBe('lost')
    expect(result.lostReason).toBe('Budget cut')
    expect(result.lostAt).not.toBeNull()
  })

  it('deal-unit-30: throws UnprocessableError when lostReason is empty string (BR-02)', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue(mockDeal)
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act & Assert
    await expect(
      service.markDealLost(caller, 'deal-id', { lostReason: '   ' }),
    ).rejects.toThrow(UnprocessableError)
    expect(repo.markDealLost).not.toHaveBeenCalled()
  })

  it('deal-unit-31: sales rep cannot mark another reps deal lost — throws ForbiddenError (BR-03)', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue({ ...mockDeal, ownerId: 'other-rep-id' })
    const caller = makeSalesRep({ sub: 'rep-id' })

    // Act & Assert
    await expect(
      service.markDealLost(caller, 'deal-id', { lostReason: 'Reason' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('deal-unit-32: throws NotFoundError when deal does not exist', async () => {
    // Arrange
    vi.mocked(repo.findDealById).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(
      service.markDealLost(caller, 'no-such-id', { lostReason: 'Reason' }),
    ).rejects.toThrow(NotFoundError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// listStages
// ─────────────────────────────────────────────────────────────────────────────

describe('dealService.listStages', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deal-unit-33: returns existing stages when they exist', async () => {
    // Arrange
    vi.mocked(repo.findAllStages).mockResolvedValue([mockStage])
    const caller = makeAdmin()

    // Act
    const result = await service.listStages(caller)

    // Assert
    expect(result).toHaveLength(1)
    expect(repo.findOrCreateDefaultPipeline).not.toHaveBeenCalled()
  })

  it('deal-unit-34: seeds default stages when no stages exist for org', async () => {
    // Arrange
    vi.mocked(repo.findAllStages).mockResolvedValue([])
    vi.mocked(repo.findOrCreateDefaultPipeline).mockResolvedValue(mockPipeline)
    vi.mocked(repo.seedDefaultStages).mockResolvedValue([mockStage])
    const caller = makeAdmin()

    // Act
    await service.listStages(caller)

    // Assert
    expect(repo.seedDefaultStages).toHaveBeenCalledWith('org-id', 'pipeline-id')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createStage
// ─────────────────────────────────────────────────────────────────────────────

describe('dealService.createStage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deal-unit-35: admin can create a pipeline stage', async () => {
    // Arrange
    vi.mocked(repo.findOrCreateDefaultPipeline).mockResolvedValue(mockPipeline)
    vi.mocked(repo.createStage).mockResolvedValue(mockStage)
    const caller = makeAdmin()

    // Act
    const result = await service.createStage(caller, {
      name: 'Prospecting',
      displayOrder: 1,
      probability: 10,
    })

    // Assert
    expect(result.name).toBe('Prospecting')
  })

  it('deal-unit-36: non-admin cannot create a stage — throws ForbiddenError', async () => {
    // Arrange
    const caller = makeSalesRep()

    // Act & Assert
    await expect(
      service.createStage(caller, { name: 'New Stage', displayOrder: 1 }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('deal-unit-37: manager cannot create a stage — throws ForbiddenError', async () => {
    // Arrange
    const caller = makeManager()

    // Act & Assert
    await expect(
      service.createStage(caller, { name: 'New Stage', displayOrder: 1 }),
    ).rejects.toThrow(ForbiddenError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateStage
// ─────────────────────────────────────────────────────────────────────────────

describe('dealService.updateStage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deal-unit-38: admin can update a pipeline stage', async () => {
    // Arrange
    const updated = { ...mockStage, name: 'Renamed Stage' }
    vi.mocked(repo.findStageById).mockResolvedValue(mockStage)
    vi.mocked(repo.updateStage).mockResolvedValue(updated)
    const caller = makeAdmin()

    // Act
    const result = await service.updateStage(caller, 'stage-id', { name: 'Renamed Stage' })

    // Assert
    expect(result?.name).toBe('Renamed Stage')
  })

  it('deal-unit-39: non-admin cannot update a stage — throws ForbiddenError', async () => {
    // Arrange
    const caller = makeSalesRep()

    // Act & Assert
    await expect(
      service.updateStage(caller, 'stage-id', { name: 'Hacked' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('deal-unit-40: throws NotFoundError when stage does not exist', async () => {
    // Arrange
    vi.mocked(repo.findStageById).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(
      service.updateStage(caller, 'no-such-stage', { name: 'Ghost' }),
    ).rejects.toThrow(NotFoundError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// deleteStage
// ─────────────────────────────────────────────────────────────────────────────

describe('dealService.deleteStage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deal-unit-41: admin can delete a stage when no open deals and not the last stage', async () => {
    // Arrange
    vi.mocked(repo.findStageById).mockResolvedValue(mockStage)
    vi.mocked(repo.countOpenDealsInStage).mockResolvedValue(0)
    vi.mocked(repo.countAllStages).mockResolvedValue(3)
    vi.mocked(repo.softDeleteStage).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act
    await service.deleteStage(caller, 'stage-id')

    // Assert
    expect(repo.softDeleteStage).toHaveBeenCalledWith('org-id', 'stage-id')
  })

  it('deal-unit-42: throws UnprocessableError when stage has open deals (BR-04, AC-08)', async () => {
    // Arrange
    vi.mocked(repo.findStageById).mockResolvedValue(mockStage)
    vi.mocked(repo.countOpenDealsInStage).mockResolvedValue(2)
    const caller = makeAdmin()

    // Act & Assert
    await expect(service.deleteStage(caller, 'stage-id')).rejects.toThrow(UnprocessableError)
    await expect(service.deleteStage(caller, 'stage-id')).rejects.toThrow(
      'Cannot delete a stage with open deals. Move or close them first.',
    )
    expect(repo.softDeleteStage).not.toHaveBeenCalled()
  })

  it('deal-unit-43: throws UnprocessableError when deleting the last stage (BR-05, AC-10)', async () => {
    // Arrange
    vi.mocked(repo.findStageById).mockResolvedValue(mockStage)
    vi.mocked(repo.countOpenDealsInStage).mockResolvedValue(0)
    vi.mocked(repo.countAllStages).mockResolvedValue(1)
    const caller = makeAdmin()

    // Act & Assert
    await expect(service.deleteStage(caller, 'stage-id')).rejects.toThrow(UnprocessableError)
    await expect(service.deleteStage(caller, 'stage-id')).rejects.toThrow(
      'The pipeline must have at least one stage.',
    )
    expect(repo.softDeleteStage).not.toHaveBeenCalled()
  })

  it('deal-unit-44: throws ForbiddenError for non-admin (permissions matrix)', async () => {
    // Arrange
    const caller = makeSalesRep()

    // Act & Assert
    await expect(service.deleteStage(caller, 'stage-id')).rejects.toThrow(ForbiddenError)
    expect(repo.softDeleteStage).not.toHaveBeenCalled()
  })

  it('deal-unit-45: throws ForbiddenError for manager (permissions matrix)', async () => {
    // Arrange
    const caller = makeManager()

    // Act & Assert
    await expect(service.deleteStage(caller, 'stage-id')).rejects.toThrow(ForbiddenError)
  })

  it('deal-unit-46: throws NotFoundError when stage does not exist', async () => {
    // Arrange
    vi.mocked(repo.findStageById).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(service.deleteStage(caller, 'no-such-stage')).rejects.toThrow(NotFoundError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// reorderStages
// ─────────────────────────────────────────────────────────────────────────────

describe('dealService.reorderStages', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deal-unit-47: admin can reorder stages; returns updated list (AC-09)', async () => {
    // Arrange
    const reorderedStages = [
      { ...mockStage, id: 'stage-b', displayOrder: 1 },
      { ...mockStage, id: 'stage-a', displayOrder: 2 },
    ]
    vi.mocked(repo.reorderStages).mockResolvedValue(undefined)
    vi.mocked(repo.findAllStages).mockResolvedValue(reorderedStages)
    const caller = makeAdmin()

    // Act
    const result = await service.reorderStages(caller, {
      stages: [
        { id: 'stage-b', displayOrder: 1 },
        { id: 'stage-a', displayOrder: 2 },
      ],
    })

    // Assert
    expect(result).toHaveLength(2)
    expect(repo.reorderStages).toHaveBeenCalledWith('org-id', [
      { id: 'stage-b', displayOrder: 1 },
      { id: 'stage-a', displayOrder: 2 },
    ])
  })

  it('deal-unit-48: non-admin cannot reorder stages — throws ForbiddenError', async () => {
    // Arrange
    const caller = makeSalesRep()

    // Act & Assert
    await expect(
      service.reorderStages(caller, { stages: [{ id: 'stage-id', displayOrder: 1 }] }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('deal-unit-49: manager cannot reorder stages — throws ForbiddenError', async () => {
    // Arrange
    const caller = makeManager()

    // Act & Assert
    await expect(
      service.reorderStages(caller, { stages: [{ id: 'stage-id', displayOrder: 1 }] }),
    ).rejects.toThrow(ForbiddenError)
  })
})
