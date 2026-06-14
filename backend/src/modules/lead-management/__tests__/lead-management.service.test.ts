/**
 * Unit Tests: Lead Management Service
 *
 * Tests the service layer in isolation — the repository is fully mocked.
 * Every BR from feature-spec.md has at least one test.
 * Both success and error paths are covered for every service function.
 *
 * Test ID convention: lead-unit-NN
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listLeads,
  createLead,
  getLeadById,
  updateLead,
  deleteLead,
  convertLead,
} from '../service'
import * as repo from '../repository'
import { db } from '../../../db'
import {
  NotFoundError,
  ForbiddenError,
  UnprocessableError,
} from '../../../lib/errors'
import type { JWTPayload } from '../../../lib/auth'
import type { Lead } from '../../../db/schema/leads'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../repository')
vi.mock('../../../db', () => ({
  db: {
    execute: vi.fn(),
  },
}))

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ORG_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const USER_ADMIN = 'aaaaaaaa-0000-0000-0000-000000000010'
const USER_MANAGER = 'aaaaaaaa-0000-0000-0000-000000000011'
const USER_REP_A = 'aaaaaaaa-0000-0000-0000-000000000012'
const USER_REP_B = 'aaaaaaaa-0000-0000-0000-000000000013'
const LEAD_ID = 'aaaaaaaa-0000-0000-0000-000000000020'
const STAGE_ID = 'aaaaaaaa-0000-0000-0000-000000000030'
const DEAL_ID = 'aaaaaaaa-0000-0000-0000-000000000040'

function makeJWT(
  sub: string,
  role: 'admin' | 'manager' | 'sales_rep',
  organizationId = ORG_A,
): JWTPayload {
  return { sub, organizationId, role, iat: 0, exp: 9999999999 }
}

function makeLead(overrides: Partial<Lead> = {}): Lead & { ownerName: string } {
  return {
    id: LEAD_ID,
    organizationId: ORG_A,
    title: 'Test Lead',
    value: '5000.00',
    status: 'new',
    source: null,
    ownerId: USER_REP_A,
    contactId: null,
    companyId: null,
    convertedAt: null,
    convertedDealId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ownerName: 'Rep A',
    ...overrides,
  }
}

// ─── listLeads ───────────────────────────────────────────────────────────────

describe('leadService.listLeads', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lead-unit-01: sales_rep always sees only their own leads (BR-03)', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [makeLead()], total: 1 })
    const caller = makeJWT(USER_REP_A, 'sales_rep')

    // Act
    const result = await listLeads(caller, { page: 1, limit: 20, sort: 'created_at', order: 'desc' })

    // Assert — ownerId is forced to caller.sub regardless of query
    expect(repo.findMany).toHaveBeenCalledWith(
      ORG_A,
      expect.objectContaining({ ownerId: USER_REP_A }),
    )
    expect(result.data).toHaveLength(1)
  })

  it('lead-unit-02: default status filter excludes disqualified and converted (BR-04)', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [], total: 0 })
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act
    await listLeads(caller, { page: 1, limit: 20, sort: 'created_at', order: 'desc' })

    // Assert — default statusList should be ['new', 'contacted']
    expect(repo.findMany).toHaveBeenCalledWith(
      ORG_A,
      expect.objectContaining({ statusList: ['new', 'contacted'] }),
    )
  })

  it('lead-unit-03: manager can filter by explicit status list (BR-04 override)', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [], total: 0 })
    const caller = makeJWT(USER_MANAGER, 'manager')

    // Act — manager requests disqualified leads
    await listLeads(caller, { page: 1, limit: 20, sort: 'created_at', order: 'desc', status: 'disqualified' })

    // Assert
    expect(repo.findMany).toHaveBeenCalledWith(
      ORG_A,
      expect.objectContaining({ statusList: ['disqualified'] }),
    )
  })

  it('lead-unit-04: manager can filter by ownerId across all reps (AC-09)', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [makeLead({ ownerId: USER_REP_B })], total: 1 })
    const caller = makeJWT(USER_MANAGER, 'manager')

    // Act
    const result = await listLeads(caller, { page: 1, limit: 20, sort: 'created_at', order: 'desc', ownerId: USER_REP_B })

    // Assert — manager-supplied ownerId is passed through
    expect(repo.findMany).toHaveBeenCalledWith(
      ORG_A,
      expect.objectContaining({ ownerId: USER_REP_B }),
    )
    expect(result.data[0].ownerId).toBe(USER_REP_B)
  })

  it('lead-unit-05: returns correct pagination metadata', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [makeLead()], total: 42 })
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act
    const result = await listLeads(caller, { page: 2, limit: 10, sort: 'created_at', order: 'desc' })

    // Assert
    expect(result.pagination).toEqual({ page: 2, limit: 10, total: 42, totalPages: 5 })
  })
})

// ─── createLead ──────────────────────────────────────────────────────────────

describe('leadService.createLead', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lead-unit-06: creates lead with status = new and owner = calling sales_rep (AC-01)', async () => {
    // Arrange
    const newLead = makeLead()
    vi.mocked(repo.create).mockResolvedValue(newLead)
    const caller = makeJWT(USER_REP_A, 'sales_rep')

    // Act
    const result = await createLead(caller, { title: 'Test Lead' })

    // Assert
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_A,
        title: 'Test Lead',
        status: 'new',
        ownerId: USER_REP_A,
      }),
    )
    expect(result.status).toBe('new')
  })

  it('lead-unit-07: sales_rep is always owner regardless of ownerId in input (BR-03)', async () => {
    // Arrange
    const newLead = makeLead({ ownerId: USER_REP_A })
    vi.mocked(repo.create).mockResolvedValue(newLead)
    const caller = makeJWT(USER_REP_A, 'sales_rep')

    // Act — sales_rep attempts to set a different ownerId; should be ignored
    await createLead(caller, { title: 'Test Lead', ownerId: USER_REP_B })

    // Assert — ownerId is forced to caller.sub for sales_rep
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: USER_REP_A }),
    )
  })

  it('lead-unit-08: admin can assign lead to another user (AC-01)', async () => {
    // Arrange
    const newLead = makeLead({ ownerId: USER_REP_B })
    vi.mocked(repo.create).mockResolvedValue(newLead)
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act
    await createLead(caller, { title: 'Test Lead', ownerId: USER_REP_B })

    // Assert — admin-supplied ownerId is used
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: USER_REP_B }),
    )
  })

  it('lead-unit-09: value defaults to 0 when not supplied (BR-03)', async () => {
    // Arrange
    const newLead = makeLead({ value: '0' })
    vi.mocked(repo.create).mockResolvedValue(newLead)
    const caller = makeJWT(USER_REP_A, 'sales_rep')

    // Act
    await createLead(caller, { title: 'No Value Lead' })

    // Assert
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ value: '0' }),
    )
  })

  it('lead-unit-10: optional fields (source, contactId, companyId) passed through when provided', async () => {
    // Arrange
    const contactId = 'cccccccc-0000-0000-0000-000000000001'
    const companyId = 'dddddddd-0000-0000-0000-000000000001'
    vi.mocked(repo.create).mockResolvedValue(makeLead({ source: 'website', contactId, companyId }))
    const caller = makeJWT(USER_REP_A, 'sales_rep')

    // Act
    await createLead(caller, { title: 'Full Lead', source: 'website', contactId, companyId })

    // Assert
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'website', contactId, companyId }),
    )
  })
})

// ─── getLeadById ─────────────────────────────────────────────────────────────

describe('leadService.getLeadById', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lead-unit-11: returns lead for admin regardless of ownerId (AC-09)', async () => {
    // Arrange
    const lead = makeLead({ ownerId: USER_REP_A })
    vi.mocked(repo.findById).mockResolvedValue(lead)
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act
    const result = await getLeadById(caller, LEAD_ID)

    // Assert
    expect(result).toEqual(lead)
    expect(repo.findById).toHaveBeenCalledWith(ORG_A, LEAD_ID)
  })

  it('lead-unit-12: returns lead for sales_rep who owns the lead (AC-03)', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(makeLead({ ownerId: USER_REP_A }))
    const caller = makeJWT(USER_REP_A, 'sales_rep')

    // Act
    const result = await getLeadById(caller, LEAD_ID)

    // Assert
    expect(result.ownerId).toBe(USER_REP_A)
  })

  it('lead-unit-13: throws ForbiddenError when sales_rep tries to view another rep\'s lead (BR-03)', async () => {
    // Arrange — lead is owned by REP_A, but REP_B is calling
    vi.mocked(repo.findById).mockResolvedValue(makeLead({ ownerId: USER_REP_A }))
    const caller = makeJWT(USER_REP_B, 'sales_rep')

    // Act & Assert
    await expect(getLeadById(caller, LEAD_ID)).rejects.toThrow(ForbiddenError)
  })

  it('lead-unit-14: throws NotFoundError when lead does not exist in org', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(undefined)
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act & Assert
    await expect(getLeadById(caller, LEAD_ID)).rejects.toThrow(NotFoundError)
  })
})

// ─── updateLead ──────────────────────────────────────────────────────────────

describe('leadService.updateLead', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lead-unit-15: admin can update any lead including ownerId reassignment', async () => {
    // Arrange
    const lead = makeLead({ ownerId: USER_REP_A })
    vi.mocked(repo.findById).mockResolvedValue(lead)
    vi.mocked(repo.update).mockResolvedValue({ ...lead, ownerId: USER_REP_B })
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act
    const result = await updateLead(caller, LEAD_ID, { ownerId: USER_REP_B })

    // Assert
    expect(result.ownerId).toBe(USER_REP_B)
  })

  it('lead-unit-16: sales_rep can update their own lead title and status (AC-04 / AC-08)', async () => {
    // Arrange
    const lead = makeLead({ ownerId: USER_REP_A })
    vi.mocked(repo.findById).mockResolvedValue(lead)
    vi.mocked(repo.update).mockResolvedValue({ ...lead, title: 'Updated', status: 'contacted' })
    const caller = makeJWT(USER_REP_A, 'sales_rep')

    // Act
    const result = await updateLead(caller, LEAD_ID, { title: 'Updated', status: 'contacted' })

    // Assert
    expect(result.title).toBe('Updated')
    expect(result.status).toBe('contacted')
  })

  it('lead-unit-17: sales_rep cannot update another rep\'s lead (BR-03)', async () => {
    // Arrange — lead owned by REP_A, REP_B calling
    vi.mocked(repo.findById).mockResolvedValue(makeLead({ ownerId: USER_REP_A }))
    const caller = makeJWT(USER_REP_B, 'sales_rep')

    // Act & Assert
    await expect(updateLead(caller, LEAD_ID, { title: 'Hack' })).rejects.toThrow(ForbiddenError)
  })

  it('lead-unit-18: sales_rep cannot reassign ownerId (permissions matrix)', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(makeLead({ ownerId: USER_REP_A }))
    const caller = makeJWT(USER_REP_A, 'sales_rep')

    // Act & Assert
    await expect(updateLead(caller, LEAD_ID, { ownerId: USER_REP_B })).rejects.toThrow(ForbiddenError)
  })

  it('lead-unit-19: throws NotFoundError when lead does not exist', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(undefined)
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act & Assert
    await expect(updateLead(caller, LEAD_ID, { title: 'X' })).rejects.toThrow(NotFoundError)
  })

  it('lead-unit-20: throws NotFoundError when repo.update returns undefined', async () => {
    // Arrange — lead found but update returns nothing (race condition / concurrent delete)
    vi.mocked(repo.findById).mockResolvedValue(makeLead())
    vi.mocked(repo.update).mockResolvedValue(undefined)
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act & Assert
    await expect(updateLead(caller, LEAD_ID, { title: 'X' })).rejects.toThrow(NotFoundError)
  })
})

// ─── deleteLead ──────────────────────────────────────────────────────────────

describe('leadService.deleteLead', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lead-unit-21: admin can soft-delete a non-converted lead (permissions matrix)', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(makeLead({ status: 'new' }))
    vi.mocked(repo.softDelete).mockResolvedValue(undefined)
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act
    await deleteLead(caller, LEAD_ID)

    // Assert
    expect(repo.softDelete).toHaveBeenCalledWith(ORG_A, LEAD_ID)
  })

  it('lead-unit-22: manager cannot delete a lead — throws ForbiddenError (permissions matrix)', async () => {
    // Arrange
    const caller = makeJWT(USER_MANAGER, 'manager')

    // Act & Assert
    await expect(deleteLead(caller, LEAD_ID)).rejects.toThrow(ForbiddenError)
    expect(repo.findById).not.toHaveBeenCalled()
  })

  it('lead-unit-23: sales_rep cannot delete a lead — throws ForbiddenError (permissions matrix)', async () => {
    // Arrange
    const caller = makeJWT(USER_REP_A, 'sales_rep')

    // Act & Assert
    await expect(deleteLead(caller, LEAD_ID)).rejects.toThrow(ForbiddenError)
    expect(repo.findById).not.toHaveBeenCalled()
  })

  it('lead-unit-24: throws NotFoundError when lead does not exist', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(undefined)
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act & Assert
    await expect(deleteLead(caller, LEAD_ID)).rejects.toThrow(NotFoundError)
    expect(repo.softDelete).not.toHaveBeenCalled()
  })

  it('lead-unit-25: throws ForbiddenError when trying to delete a converted lead (BR-02)', async () => {
    // Arrange — converted leads are retained as audit trail and cannot be deleted
    vi.mocked(repo.findById).mockResolvedValue(makeLead({ status: 'converted' }))
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act & Assert
    await expect(deleteLead(caller, LEAD_ID)).rejects.toThrow(ForbiddenError)
    expect(repo.softDelete).not.toHaveBeenCalled()
  })
})

// ─── convertLead ─────────────────────────────────────────────────────────────

describe('leadService.convertLead', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lead-unit-26: successfully converts lead — creates deal and marks lead converted (AC-05)', async () => {
    // Arrange
    const lead = makeLead({ status: 'new', ownerId: USER_REP_A })
    const convertedLead = { ...lead, status: 'converted' as const, convertedAt: new Date(), convertedDealId: DEAL_ID }
    vi.mocked(repo.findById).mockResolvedValue(lead)
    vi.mocked(repo.convertLead).mockResolvedValue(convertedLead)
    vi.mocked(db.execute).mockResolvedValue({
      rows: [{ id: DEAL_ID, title: 'Test Lead', stage_id: STAGE_ID }],
    } as any)
    const caller = makeJWT(USER_REP_A, 'sales_rep')

    // Act
    const result = await convertLead(caller, LEAD_ID, { stageId: STAGE_ID })

    // Assert
    expect(result.lead.status).toBe('converted')
    expect(result.deal).toEqual({ id: DEAL_ID, title: 'Test Lead', stageId: STAGE_ID })
    expect(repo.convertLead).toHaveBeenCalledWith(ORG_A, LEAD_ID, DEAL_ID)
  })

  it('lead-unit-27: throws UnprocessableError when lead is already converted (BR-01 / AC-07)', async () => {
    // Arrange — lead is already converted
    vi.mocked(repo.findById).mockResolvedValue(makeLead({ status: 'converted' }))
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act & Assert
    await expect(convertLead(caller, LEAD_ID, { stageId: STAGE_ID })).rejects.toThrow(UnprocessableError)
    await expect(convertLead(caller, LEAD_ID, { stageId: STAGE_ID })).rejects.toThrow(
      'This lead has already been converted.',
    )
  })

  it('lead-unit-28: sales_rep cannot convert another rep\'s lead (BR-03)', async () => {
    // Arrange — lead owned by REP_A, REP_B calling
    vi.mocked(repo.findById).mockResolvedValue(makeLead({ ownerId: USER_REP_A }))
    const caller = makeJWT(USER_REP_B, 'sales_rep')

    // Act & Assert
    await expect(convertLead(caller, LEAD_ID, { stageId: STAGE_ID })).rejects.toThrow(ForbiddenError)
  })

  it('lead-unit-29: throws NotFoundError when lead not found in org', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(undefined)
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act & Assert
    await expect(convertLead(caller, LEAD_ID, { stageId: STAGE_ID })).rejects.toThrow(NotFoundError)
  })

  it('lead-unit-30: proceeds with null deal when deals table does not exist (AC-05 graceful)', async () => {
    // Arrange — db.execute throws (deals table not yet created)
    const lead = makeLead({ status: 'new' })
    const convertedLead = { ...lead, status: 'converted' as const, convertedAt: new Date(), convertedDealId: null }
    vi.mocked(repo.findById).mockResolvedValue(lead)
    vi.mocked(db.execute).mockRejectedValue(new Error('relation "deals" does not exist'))
    vi.mocked(repo.convertLead).mockResolvedValue(convertedLead)
    const caller = makeJWT(USER_ADMIN, 'admin')

    // Act
    const result = await convertLead(caller, LEAD_ID, { stageId: STAGE_ID })

    // Assert — lead is still converted even without a deal record
    expect(result.lead.status).toBe('converted')
    expect(result.deal).toBeNull()
    expect(repo.convertLead).toHaveBeenCalledWith(ORG_A, LEAD_ID, null)
  })

  it('lead-unit-31: converted deal inherits contact_id and company_id from lead (open question resolved)', async () => {
    // Arrange
    const contactId = 'cccccccc-0000-0000-0000-000000000001'
    const companyId = 'dddddddd-0000-0000-0000-000000000001'
    const lead = makeLead({ status: 'new', contactId, companyId })
    const convertedLead = { ...lead, status: 'converted' as const, convertedAt: new Date(), convertedDealId: DEAL_ID }
    vi.mocked(repo.findById).mockResolvedValue(lead)
    vi.mocked(repo.convertLead).mockResolvedValue(convertedLead)
    vi.mocked(db.execute).mockResolvedValue({
      rows: [{ id: DEAL_ID, title: 'Test Lead', stage_id: STAGE_ID }],
    } as any)
    const caller = makeJWT(USER_REP_A, 'sales_rep')

    // Act
    await convertLead(caller, LEAD_ID, { stageId: STAGE_ID })

    // Assert — deal INSERT includes contact_id and company_id from the lead
    const executeSql = (db.execute as ReturnType<typeof vi.fn>).mock.calls[0][0].sql as string
    expect(executeSql).toContain('contact_id')
    expect(executeSql).toContain('company_id')
    const executeParams = (db.execute as ReturnType<typeof vi.fn>).mock.calls[0][0].params as unknown[]
    expect(executeParams).toContain(contactId)
    expect(executeParams).toContain(companyId)
  })

  it('lead-unit-32: manager can convert any lead in the org (permissions matrix)', async () => {
    // Arrange — lead owned by REP_A, MANAGER calling
    const lead = makeLead({ ownerId: USER_REP_A, status: 'new' })
    const convertedLead = { ...lead, status: 'converted' as const, convertedAt: new Date(), convertedDealId: DEAL_ID }
    vi.mocked(repo.findById).mockResolvedValue(lead)
    vi.mocked(repo.convertLead).mockResolvedValue(convertedLead)
    vi.mocked(db.execute).mockResolvedValue({
      rows: [{ id: DEAL_ID, title: 'Test Lead', stage_id: STAGE_ID }],
    } as any)
    const caller = makeJWT(USER_MANAGER, 'manager')

    // Act
    const result = await convertLead(caller, LEAD_ID, { stageId: STAGE_ID })

    // Assert — no ForbiddenError thrown
    expect(result.lead.status).toBe('converted')
  })
})

// ─── Disqualify (via updateLead) ─────────────────────────────────────────────

describe('leadService — disqualify (AC-08)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lead-unit-33: sales_rep can set status to disqualified on their own lead (AC-08)', async () => {
    // Arrange
    const lead = makeLead({ ownerId: USER_REP_A, status: 'contacted' })
    const disqualifiedLead = { ...lead, status: 'disqualified' as const }
    vi.mocked(repo.findById).mockResolvedValue(lead)
    vi.mocked(repo.update).mockResolvedValue(disqualifiedLead)
    const caller = makeJWT(USER_REP_A, 'sales_rep')

    // Act
    const result = await updateLead(caller, LEAD_ID, { status: 'disqualified' })

    // Assert
    expect(result.status).toBe('disqualified')
  })
})
