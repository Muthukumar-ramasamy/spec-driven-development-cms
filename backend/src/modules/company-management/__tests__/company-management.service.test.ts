import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConflictError, ForbiddenError, NotFoundError } from '../../../lib/errors'
import * as service from '../service'
import * as repo from '../repository'

vi.mock('../repository')

const makeAdmin = (o = {}) => ({ sub: 'admin-id', organizationId: 'org-id', role: 'admin' as const, ...o })
const makeManager = (o = {}) => ({ sub: 'manager-id', organizationId: 'org-id', role: 'manager' as const, ...o })
const makeRep = (o = {}) => ({ sub: 'rep-id', organizationId: 'org-id', role: 'sales_rep' as const, ...o })

const baseQuery = { page: 1, limit: 20, sort: 'created_at', order: 'desc' as const }

const mockCompany = {
  id: 'company-id',
  organizationId: 'org-id',
  ownerId: 'rep-id',
  name: 'Acme Corp',
  website: null,
  industry: null,
  employeeCount: null,
  notes: null,
  ownerName: 'Rep User',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

// ─────────────────────────────────────────────────────────────
// listCompanies
// ─────────────────────────────────────────────────────────────
describe('companyService.listCompanies', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('companies-unit-03: all roles see all org companies (no ownerId forcing)', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [mockCompany], total: 1 })
    const caller = makeRep()

    // Act
    await service.listCompanies(caller, baseQuery)

    // Assert — ownerId must NOT be passed; sales rep sees all companies
    expect(repo.findMany).toHaveBeenCalledWith('org-id', expect.objectContaining({ page: 1 }))
    expect(repo.findMany).toHaveBeenCalledWith('org-id', expect.not.objectContaining({ ownerId: expect.anything() }))
  })

  it('companies-unit-04: returns pagination meta alongside data', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [mockCompany], total: 1 })

    // Act
    const result = await service.listCompanies(makeAdmin(), baseQuery)

    // Assert
    expect(result.data).toHaveLength(1)
    expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 1 })
  })
})

// ─────────────────────────────────────────────────────────────
// createCompany
// ─────────────────────────────────────────────────────────────
describe('companyService.createCompany', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('companies-unit-01: creates company with valid data', async () => {
    // Arrange
    vi.mocked(repo.findByName).mockResolvedValue(undefined)
    vi.mocked(repo.create).mockResolvedValue(mockCompany)
    const caller = makeRep()

    // Act
    const result = await service.createCompany(caller, { name: 'Acme Corp' })

    // Assert
    expect(result).toEqual(mockCompany)
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Acme Corp', organizationId: 'org-id' }),
    )
  })

  it('companies-unit-02: throws ConflictError for duplicate name in org (BR-01)', async () => {
    // Arrange
    vi.mocked(repo.findByName).mockResolvedValue(mockCompany)
    const caller = makeAdmin()

    // Act & Assert
    await expect(
      service.createCompany(caller, { name: 'Acme Corp' }),
    ).rejects.toThrow(ConflictError)
  })

  it('companies-unit-01b: sales rep owner_id forced to caller.sub', async () => {
    // Arrange
    vi.mocked(repo.findByName).mockResolvedValue(undefined)
    vi.mocked(repo.create).mockResolvedValue(mockCompany)
    const caller = makeRep({ sub: 'rep-id' })

    // Act
    await service.createCompany(caller, { name: 'Acme Corp', ownerId: 'other-user-id' })

    // Assert — ownerId must be caller.sub, not the provided ownerId
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'rep-id' }),
    )
  })

  it('companies-unit-01c: admin can assign a different owner', async () => {
    // Arrange
    vi.mocked(repo.findByName).mockResolvedValue(undefined)
    vi.mocked(repo.create).mockResolvedValue({ ...mockCompany, ownerId: 'another-user-id' })
    const caller = makeAdmin({ sub: 'admin-id' })

    // Act
    await service.createCompany(caller, { name: 'Acme Corp', ownerId: 'another-user-id' })

    // Assert
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'another-user-id' }),
    )
  })
})

// ─────────────────────────────────────────────────────────────
// getCompanyById
// ─────────────────────────────────────────────────────────────
describe('companyService.getCompanyById', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('companies-unit-detail-ok: returns company with empty contacts and deals arrays', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(mockCompany)
    const caller = makeRep()

    // Act
    const result = await service.getCompanyById(caller, 'company-id')

    // Assert
    expect(result.contacts).toEqual([])
    expect(result.deals).toEqual([])
    expect(result.id).toBe('company-id')
  })

  it('companies-unit-notfound: throws NotFoundError when company does not exist', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(undefined)

    // Act & Assert
    await expect(service.getCompanyById(makeAdmin(), 'no-such-id')).rejects.toThrow(NotFoundError)
  })
})

// ─────────────────────────────────────────────────────────────
// updateCompany
// ─────────────────────────────────────────────────────────────
describe('companyService.updateCompany', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('companies-unit-update-owner: owner can update their company (BR-03)', async () => {
    // Arrange
    const updated = { ...mockCompany, name: 'Acme Updated' }
    vi.mocked(repo.findById).mockResolvedValue(mockCompany)
    vi.mocked(repo.update).mockResolvedValue(updated)
    const caller = makeRep({ sub: 'rep-id' })

    // Act
    const result = await service.updateCompany(caller, 'company-id', { name: 'Acme Updated' })

    // Assert
    expect(result.name).toBe('Acme Updated')
  })

  it('companies-unit-update-forbidden: sales rep cannot edit another rep company (BR-03)', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue({ ...mockCompany, ownerId: 'other-rep-id' })
    const caller = makeRep({ sub: 'rep-id' })

    // Act & Assert
    await expect(
      service.updateCompany(caller, 'company-id', { name: 'Hacked' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('companies-unit-update-manager-any: manager can edit any company in the org', async () => {
    // Arrange
    const updated = { ...mockCompany, ownerId: 'some-rep', name: 'Manager Updated' }
    vi.mocked(repo.findById).mockResolvedValue({ ...mockCompany, ownerId: 'some-rep' })
    vi.mocked(repo.update).mockResolvedValue(updated)
    const caller = makeManager()

    // Act
    const result = await service.updateCompany(caller, 'company-id', { name: 'Manager Updated' })

    // Assert
    expect(result.name).toBe('Manager Updated')
  })

  it('companies-unit-update-no-reassign: sales rep cannot reassign owner', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(mockCompany)
    const caller = makeRep({ sub: 'rep-id' })

    // Act & Assert
    await expect(
      service.updateCompany(caller, 'company-id', { ownerId: 'other-user-id' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('companies-unit-update-conflict: throws ConflictError when changing to taken name (BR-01)', async () => {
    // Arrange
    const takenCompany = { ...mockCompany, id: 'other-company-id', name: 'Taken Name' }
    vi.mocked(repo.findById).mockResolvedValue(mockCompany)
    vi.mocked(repo.findByName).mockResolvedValue(takenCompany)
    const caller = makeAdmin()

    // Act & Assert
    await expect(
      service.updateCompany(caller, 'company-id', { name: 'Taken Name' }),
    ).rejects.toThrow(ConflictError)
  })
})

// ─────────────────────────────────────────────────────────────
// deleteCompany
// ─────────────────────────────────────────────────────────────
describe('companyService.deleteCompany', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('companies-unit-05: admin can soft-delete a company', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(mockCompany)
    vi.mocked(repo.softDelete).mockResolvedValue(undefined)
    vi.mocked(repo.unlinkCompanyContacts).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act
    await service.deleteCompany(caller, 'company-id')

    // Assert
    expect(repo.softDelete).toHaveBeenCalledWith('org-id', 'company-id')
  })

  it('companies-unit-07: contacts unlinked after soft-delete (BR-02)', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(mockCompany)
    vi.mocked(repo.softDelete).mockResolvedValue(undefined)
    vi.mocked(repo.unlinkCompanyContacts).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act
    await service.deleteCompany(caller, 'company-id')

    // Assert
    expect(repo.unlinkCompanyContacts).toHaveBeenCalledWith('org-id', 'company-id')
  })

  it('companies-unit-06: throws ForbiddenError when manager attempts delete', async () => {
    // Arrange
    const caller = makeManager()

    // Act & Assert
    await expect(service.deleteCompany(caller, 'company-id')).rejects.toThrow(ForbiddenError)
    expect(repo.softDelete).not.toHaveBeenCalled()
    expect(repo.unlinkCompanyContacts).not.toHaveBeenCalled()
  })

  it('companies-unit-06b: throws ForbiddenError when sales rep attempts delete', async () => {
    // Arrange
    const caller = makeRep()

    // Act & Assert
    await expect(service.deleteCompany(caller, 'company-id')).rejects.toThrow(ForbiddenError)
    expect(repo.softDelete).not.toHaveBeenCalled()
  })

  it('companies-unit-notfound-delete: throws NotFoundError when company does not exist', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(service.deleteCompany(caller, 'no-such-id')).rejects.toThrow(NotFoundError)
    expect(repo.softDelete).not.toHaveBeenCalled()
  })
})
