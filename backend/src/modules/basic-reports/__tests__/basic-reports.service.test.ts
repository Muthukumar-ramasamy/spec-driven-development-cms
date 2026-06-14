/**
 * Unit Tests — Basic Reports Service
 *
 * Test IDs: reports-unit-01 … reports-unit-20
 *
 * Coverage:
 *   BR-01  All report data org-scoped (organizationId always from JWT)
 *   BR-02  Sales Rep ownerId silently overridden to caller.sub (never 403)
 *   BR-03  Reports are read-only — no mutations
 *   BR-04  Default date range = last 30 days when no params supplied
 *   AC-01  Deals report filtered by won_at / lost_at within date range
 *   AC-02  Pipeline value scoped to org, only open deals
 *   AC-03  Pipeline value grouped by stage
 *   AC-04  Activity report by rep, filtered by date range
 *   AC-05  Leads by source, filtered by date range
 *   AC-06  Sales Rep sees own data only
 *   AC-07  Manager sees all-org data
 *   AC-08  Default date range = last 30 days
 *
 * Error paths:
 *   Invalid date format → ValidationError (400)
 *   startDate after endDate → ValidationError (400)
 *   ownerId not in org → NotFoundError (404)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ValidationError, NotFoundError } from '../../../lib/errors'
import * as service from '../service'
import * as repo from '../repository'

// Mock the entire repository module — all functions become no-ops by default
vi.mock('../repository')

// ─── Caller factories ──────────────────────────────────────────────────────────

const iat = Math.floor(Date.now() / 1000)
const exp = iat + 3600

function makeAdmin(overrides: Partial<{ sub: string; organizationId: string }> = {}) {
  return {
    sub: 'admin-uuid',
    organizationId: 'org-uuid',
    role: 'admin' as const,
    iat,
    exp,
    ...overrides,
  }
}

function makeManager(overrides: Partial<{ sub: string; organizationId: string }> = {}) {
  return {
    sub: 'manager-uuid',
    organizationId: 'org-uuid',
    role: 'manager' as const,
    iat,
    exp,
    ...overrides,
  }
}

function makeSalesRep(overrides: Partial<{ sub: string; organizationId: string }> = {}) {
  return {
    sub: 'rep-uuid',
    organizationId: 'org-uuid',
    role: 'sales_rep' as const,
    iat,
    exp,
    ...overrides,
  }
}

// ─── Fixture data ──────────────────────────────────────────────────────────────

const mockDealsReport = {
  won: { count: 5, totalValue: 50000 },
  lost: { count: 2, totalValue: 10000 },
  dateRange: { startDate: '2026-05-13', endDate: '2026-06-13' },
}

const mockPipelineValue = {
  stages: [
    { stageId: 'stage-1', stageName: 'Lead In', dealCount: 3, totalValue: 30000 },
    { stageId: 'stage-2', stageName: 'Demo', dealCount: 1, totalValue: 15000 },
  ],
  grandTotal: 45000,
}

const mockActivitiesReport = {
  reps: [
    {
      userId: 'rep-uuid',
      name: 'Sam Lee',
      call: 5, email: 3, meeting: 2, demo: 1, lunch: 0, other: 1,
      total: 12,
    },
  ],
  dateRange: { startDate: '2026-05-13', endDate: '2026-06-13' },
}

const mockLeadsBySource = {
  sources: [
    { source: 'website', count: 7 },
    { source: 'referral', count: 4 },
  ],
  dateRange: { startDate: '2026-05-13', endDate: '2026-06-13' },
}

// ─────────────────────────────────────────────────────────────────────────────
// getDealsReport
// ─────────────────────────────────────────────────────────────────────────────

describe('basicReportsService.getDealsReport', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('reports-unit-01: returns won/lost counts when valid date range supplied', async () => {
    // Arrange
    vi.mocked(repo.getDealsReport).mockResolvedValue(mockDealsReport)

    // Act
    const result = await service.getDealsReport(makeManager(), {
      startDate: '2026-05-13',
      endDate: '2026-06-13',
    })

    // Assert
    expect(result).toEqual(mockDealsReport)
    expect(repo.getDealsReport).toHaveBeenCalledOnce()
  })

  it('reports-unit-02: BR-01 — organizationId always taken from JWT, never from query', async () => {
    // Arrange
    vi.mocked(repo.getDealsReport).mockResolvedValue(mockDealsReport)
    const manager = makeManager({ organizationId: 'jwt-org-id' })

    // Act
    await service.getDealsReport(manager, { startDate: '2026-05-13', endDate: '2026-06-13' })

    // Assert — organizationId must equal the JWT value, not anything injected externally
    expect(repo.getDealsReport).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'jwt-org-id' }),
    )
  })

  it('reports-unit-03: BR-02 — sales rep ownerId silently overridden to caller.sub (no 403)', async () => {
    // Arrange
    vi.mocked(repo.getDealsReport).mockResolvedValue(mockDealsReport)
    const rep = makeSalesRep({ sub: 'rep-uuid' })

    // Act — rep passes another user's ownerId; it must be silently overridden
    await service.getDealsReport(rep, {
      startDate: '2026-05-13',
      endDate: '2026-06-13',
      ownerId: 'some-other-user-uuid',
    })

    // Assert — repo called with rep's own sub, not the requested ownerId
    expect(repo.getDealsReport).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'rep-uuid' }),
    )
  })

  it('reports-unit-04: AC-06 — sales rep query always restricted to own user ID', async () => {
    // Arrange
    vi.mocked(repo.getDealsReport).mockResolvedValue(mockDealsReport)
    const rep = makeSalesRep({ sub: 'my-rep-id' })

    // Act — rep with no ownerId param: should still be scoped to their own sub
    await service.getDealsReport(rep, {})

    // Assert
    expect(repo.getDealsReport).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'my-rep-id' }),
    )
  })

  it('reports-unit-05: AC-07 — manager with no ownerId param sees all-org data (ownerId undefined)', async () => {
    // Arrange
    vi.mocked(repo.getDealsReport).mockResolvedValue(mockDealsReport)

    // Act
    await service.getDealsReport(makeManager(), {})

    // Assert — ownerId NOT passed to repo → all-org query
    expect(repo.getDealsReport).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: undefined }),
    )
  })

  it('reports-unit-06: AC-08 / BR-04 — default date range covers ~30 days when no dates supplied', async () => {
    // Arrange
    vi.mocked(repo.getDealsReport).mockResolvedValue(mockDealsReport)
    const beforeCall = Date.now()

    // Act
    await service.getDealsReport(makeManager(), {})

    // Assert — inspect the dates forwarded to the repo
    const call = vi.mocked(repo.getDealsReport).mock.calls[0][0]
    const afterCall = Date.now()

    expect(call.endDate.getTime()).toBeGreaterThanOrEqual(beforeCall - 1000)
    expect(call.endDate.getTime()).toBeLessThanOrEqual(afterCall + 1000)

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    const diff = call.endDate.getTime() - call.startDate.getTime()
    // Range should be ~30 days (±2 minutes of test execution drift)
    expect(diff).toBeGreaterThan(thirtyDaysMs - 120_000)
    expect(diff).toBeLessThan(thirtyDaysMs + 120_000 + 86_400_000) // +1 day for start-of-day clamping
  })

  it('reports-unit-07: invalid startDate format → ValidationError (400)', async () => {
    // Arrange — no repo call expected

    // Act & Assert
    await expect(
      service.getDealsReport(makeManager(), { startDate: 'not-a-date', endDate: '2026-06-13' }),
    ).rejects.toThrow(ValidationError)
  })

  it('reports-unit-08: invalid endDate format → ValidationError (400)', async () => {
    await expect(
      service.getDealsReport(makeManager(), { startDate: '2026-05-13', endDate: 'tomorrow' }),
    ).rejects.toThrow(ValidationError)
  })

  it('reports-unit-09: startDate after endDate → ValidationError with message', async () => {
    await expect(
      service.getDealsReport(makeManager(), { startDate: '2026-06-13', endDate: '2026-05-01' }),
    ).rejects.toThrow('startDate must be before or equal to endDate.')
  })

  it('reports-unit-10: manager supplied ownerId not in org → NotFoundError (404)', async () => {
    // Arrange
    vi.mocked(repo.findUserInOrg).mockResolvedValue(undefined)

    // Act & Assert
    await expect(
      service.getDealsReport(makeManager(), {
        startDate: '2026-05-13',
        endDate: '2026-06-13',
        ownerId: 'unknown-user-uuid',
      }),
    ).rejects.toThrow(NotFoundError)
  })

  it('reports-unit-11: manager supplied valid ownerId in org → repo called with that ownerId', async () => {
    // Arrange
    vi.mocked(repo.findUserInOrg).mockResolvedValue({ id: 'valid-rep-uuid' })
    vi.mocked(repo.getDealsReport).mockResolvedValue(mockDealsReport)

    // Act
    await service.getDealsReport(makeManager(), {
      startDate: '2026-05-13',
      endDate: '2026-06-13',
      ownerId: 'valid-rep-uuid',
    })

    // Assert — repo receives the manager-requested ownerId unchanged
    expect(repo.getDealsReport).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'valid-rep-uuid' }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getPipelineValueReport
// ─────────────────────────────────────────────────────────────────────────────

describe('basicReportsService.getPipelineValueReport', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('reports-unit-12: AC-02/AC-03 — returns stages with grandTotal for manager', async () => {
    // Arrange
    vi.mocked(repo.getPipelineValueReport).mockResolvedValue(mockPipelineValue)

    // Act
    const result = await service.getPipelineValueReport(makeManager(), {})

    // Assert
    expect(result.stages).toHaveLength(2)
    expect(result.grandTotal).toBe(45000)
    expect(repo.getPipelineValueReport).toHaveBeenCalledOnce()
  })

  it('reports-unit-13: BR-01 — organizationId from JWT forwarded to repo', async () => {
    // Arrange
    vi.mocked(repo.getPipelineValueReport).mockResolvedValue(mockPipelineValue)
    const manager = makeManager({ organizationId: 'tenant-org' })

    // Act
    await service.getPipelineValueReport(manager, {})

    // Assert
    expect(repo.getPipelineValueReport).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'tenant-org' }),
    )
  })

  it('reports-unit-14: BR-02 — sales rep ownerId overridden to own sub on pipeline value', async () => {
    // Arrange
    vi.mocked(repo.getPipelineValueReport).mockResolvedValue(mockPipelineValue)
    const rep = makeSalesRep({ sub: 'rep-sub' })

    // Act
    await service.getPipelineValueReport(rep, { ownerId: 'other-rep-uuid' })

    // Assert
    expect(repo.getPipelineValueReport).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'rep-sub' }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getActivitiesReport
// ─────────────────────────────────────────────────────────────────────────────

describe('basicReportsService.getActivitiesReport', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('reports-unit-15: AC-04 — returns per-type activity counts for specified rep', async () => {
    // Arrange
    vi.mocked(repo.findUserInOrg).mockResolvedValue({ id: 'rep-uuid' })
    vi.mocked(repo.getActivitiesReport).mockResolvedValue(mockActivitiesReport)

    // Act
    const result = await service.getActivitiesReport(makeManager(), {
      startDate: '2026-05-13',
      endDate: '2026-06-13',
      ownerId: 'rep-uuid',
    })

    // Assert — verify individual type columns present
    expect(result.reps[0]).toMatchObject({
      call: 5, email: 3, meeting: 2, demo: 1, lunch: 0, other: 1, total: 12,
    })
  })

  it('reports-unit-16: BR-02 — sales rep cannot see other reps activity; ownerId overridden', async () => {
    // Arrange
    vi.mocked(repo.getActivitiesReport).mockResolvedValue(mockActivitiesReport)
    const rep = makeSalesRep({ sub: 'rep-uuid' })

    // Act
    await service.getActivitiesReport(rep, {
      ownerId: 'other-rep-uuid',
    })

    // Assert
    expect(repo.getActivitiesReport).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'rep-uuid' }),
    )
  })

  it('reports-unit-17: BR-04 — default date range applied when no dates provided', async () => {
    // Arrange
    vi.mocked(repo.getActivitiesReport).mockResolvedValue(mockActivitiesReport)

    // Act
    await service.getActivitiesReport(makeManager(), {})

    // Assert — both dates must be real Date objects (not undefined)
    const call = vi.mocked(repo.getActivitiesReport).mock.calls[0][0]
    expect(call.startDate).toBeInstanceOf(Date)
    expect(call.endDate).toBeInstanceOf(Date)
    expect(isNaN(call.startDate.getTime())).toBe(false)
    expect(isNaN(call.endDate.getTime())).toBe(false)
  })

  it('reports-unit-18: invalid date format for activities → ValidationError', async () => {
    await expect(
      service.getActivitiesReport(makeManager(), { startDate: '13/06/2026' }),
    ).rejects.toThrow(ValidationError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getLeadsBySourceReport
// ─────────────────────────────────────────────────────────────────────────────

describe('basicReportsService.getLeadsBySourceReport', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('reports-unit-19: AC-05 — returns lead counts grouped by source', async () => {
    // Arrange
    vi.mocked(repo.getLeadsBySourceReport).mockResolvedValue(mockLeadsBySource)

    // Act
    const result = await service.getLeadsBySourceReport(makeAdmin(), {
      startDate: '2026-05-13',
      endDate: '2026-06-13',
    })

    // Assert
    expect(result.sources).toEqual(
      expect.arrayContaining([
        { source: 'website', count: 7 },
        { source: 'referral', count: 4 },
      ]),
    )
  })

  it('reports-unit-20: BR-02 — sales rep ownerId overridden to own sub for leads report', async () => {
    // Arrange
    vi.mocked(repo.getLeadsBySourceReport).mockResolvedValue(mockLeadsBySource)
    const rep = makeSalesRep({ sub: 'rep-sub-id' })

    // Act
    await service.getLeadsBySourceReport(rep, { ownerId: 'other-uuid' })

    // Assert
    expect(repo.getLeadsBySourceReport).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'rep-sub-id' }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BR-03 — Read-only module: no mutation functions exist
// ─────────────────────────────────────────────────────────────────────────────

describe('basicReportsService — BR-03 read-only enforcement', () => {
  it('reports-unit-21: service module exports only getter functions (no create/update/delete)', () => {
    // Arrange & Act
    const exportedKeys = Object.keys(service)

    // Assert — must NOT export any mutating function names
    const mutationPatterns = ['create', 'update', 'delete', 'remove', 'patch', 'upsert']
    for (const pattern of mutationPatterns) {
      const hasMutation = exportedKeys.some((key) => key.toLowerCase().includes(pattern))
      expect(hasMutation, `service should not export mutation: ${pattern}`).toBe(false)
    }

    // Assert — must export all four read functions
    expect(exportedKeys).toContain('getDealsReport')
    expect(exportedKeys).toContain('getPipelineValueReport')
    expect(exportedKeys).toContain('getActivitiesReport')
    expect(exportedKeys).toContain('getLeadsBySourceReport')
  })
})
