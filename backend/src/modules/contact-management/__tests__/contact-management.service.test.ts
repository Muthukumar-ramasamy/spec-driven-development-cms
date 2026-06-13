import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConflictError, ForbiddenError, NotFoundError } from '../../../lib/errors'
import * as service from '../service'
import * as repo from '../repository'

vi.mock('../repository')

const makeCallerAdmin = (overrides = {}) => ({
  sub: 'admin-user-id',
  organizationId: 'org-id',
  role: 'admin' as const,
  ...overrides,
})

const makeCallerManager = (overrides = {}) => ({
  sub: 'manager-user-id',
  organizationId: 'org-id',
  role: 'manager' as const,
  ...overrides,
})

const makeCallerSalesRep = (overrides = {}) => ({
  sub: 'rep-user-id',
  organizationId: 'org-id',
  role: 'sales_rep' as const,
  ...overrides,
})

const baseQuery = {
  page: 1,
  limit: 20,
  sort: 'created_at',
  order: 'desc' as const,
}

const mockContact = {
  id: 'contact-id',
  organizationId: 'org-id',
  ownerId: 'rep-user-id',
  createdBy: 'rep-user-id',
  companyId: null,
  firstName: 'Sam',
  lastName: null,
  email: null,
  phone: null,
  jobTitle: null,
  linkedinUrl: null,
  source: 'manual' as const,
  ownerName: 'Sam Rep',
  companyName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

describe('contactService.listContacts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('contacts-unit-05: sales rep only sees own contacts (ownerId forced to caller.sub)', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [mockContact], total: 1 })
    const caller = makeCallerSalesRep({ sub: 'rep-user-id' })

    // Act
    await service.listContacts(caller, baseQuery)

    // Assert
    expect(repo.findMany).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({ ownerId: 'rep-user-id' }),
    )
  })

  it('contacts-unit-06: manager sees all org contacts (ownerId not forced)', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [], total: 0 })
    const caller = makeCallerManager()

    // Act
    await service.listContacts(caller, { ...baseQuery, ownerId: undefined })

    // Assert
    expect(repo.findMany).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({ ownerId: undefined }),
    )
  })

  it('contacts-unit-07: returns pagination meta alongside data', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [mockContact], total: 1 })
    const caller = makeCallerAdmin()

    // Act
    const result = await service.listContacts(caller, baseQuery)

    // Assert
    expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 1 })
    expect(result.data).toHaveLength(1)
  })
})

describe('contactService.createContact', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('contacts-unit-01: creates contact with name only (no email)', async () => {
    // Arrange
    vi.mocked(repo.create).mockResolvedValue(mockContact)
    const caller = makeCallerSalesRep()

    // Act
    const result = await service.createContact(caller, { firstName: 'Sam' })

    // Assert
    expect(result).toEqual(mockContact)
    expect(repo.findByEmail).not.toHaveBeenCalled()
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Sam', ownerId: 'rep-user-id' }),
    )
  })

  it('contacts-unit-02: creates contact with all fields', async () => {
    // Arrange
    vi.mocked(repo.findByEmail).mockResolvedValue(undefined)
    vi.mocked(repo.create).mockResolvedValue({ ...mockContact, email: 'sam@co.com' })
    const caller = makeCallerSalesRep()

    // Act
    const result = await service.createContact(caller, {
      firstName: 'Sam',
      email: 'sam@co.com',
      phone: '555-0100',
      jobTitle: 'Engineer',
    })

    // Assert
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'sam@co.com', phone: '555-0100' }),
    )
    expect(result.email).toBe('sam@co.com')
  })

  it('contacts-unit-03: throws ConflictError for duplicate email in org', async () => {
    // Arrange
    vi.mocked(repo.findByEmail).mockResolvedValue(mockContact)
    const caller = makeCallerSalesRep()

    // Act & Assert
    await expect(
      service.createContact(caller, { firstName: 'Sam', email: 'sam@co.com' }),
    ).rejects.toThrow(ConflictError)
  })

  it('contacts-unit-04: sales rep owner_id forced to caller.sub even if ownerId provided', async () => {
    // Arrange
    vi.mocked(repo.create).mockResolvedValue(mockContact)
    const caller = makeCallerSalesRep({ sub: 'rep-user-id' })

    // Act
    await service.createContact(caller, { firstName: 'Sam', ownerId: 'other-user-id' })

    // Assert — ownerId must be caller.sub, not the supplied ownerId
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'rep-user-id' }),
    )
  })

  it('contacts-unit-04b: normalises email to lowercase on create', async () => {
    // Arrange
    vi.mocked(repo.findByEmail).mockResolvedValue(undefined)
    vi.mocked(repo.create).mockResolvedValue(mockContact)
    const caller = makeCallerAdmin()

    // Act
    await service.createContact(caller, { firstName: 'Sam', email: 'SAM@CO.COM' })

    // Assert
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'sam@co.com' }),
    )
  })
})

describe('contactService.getContactById', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('contacts-unit-13: returns contact with empty related arrays', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(mockContact)
    const caller = makeCallerSalesRep({ sub: 'rep-user-id' })

    // Act
    const result = await service.getContactById(caller, 'contact-id')

    // Assert
    expect(result.deals).toEqual([])
    expect(result.activities).toEqual([])
    expect(result.notes).toEqual([])
  })

  it('contacts-unit-14: throws NotFoundError when contact not found', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(undefined)
    const caller = makeCallerAdmin()

    // Act & Assert
    await expect(service.getContactById(caller, 'no-such-id')).rejects.toThrow(NotFoundError)
  })

  it('contacts-unit-15: sales rep cannot view contact they do not own', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue({ ...mockContact, ownerId: 'other-rep-id' })
    const caller = makeCallerSalesRep({ sub: 'rep-user-id' })

    // Act & Assert
    await expect(service.getContactById(caller, 'contact-id')).rejects.toThrow(ForbiddenError)
  })
})

describe('contactService.updateContact', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('contacts-unit-08: owner can update their contact', async () => {
    // Arrange
    const updatedContact = { ...mockContact, firstName: 'Updated' }
    vi.mocked(repo.findById).mockResolvedValue(mockContact)
    vi.mocked(repo.update).mockResolvedValue(updatedContact)
    const caller = makeCallerSalesRep({ sub: 'rep-user-id' })

    // Act
    const result = await service.updateContact(caller, 'contact-id', { firstName: 'Updated' })

    // Assert
    expect(result.firstName).toBe('Updated')
    expect(repo.update).toHaveBeenCalled()
  })

  it('contacts-unit-09: throws ForbiddenError when sales rep edits another rep contact', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue({ ...mockContact, ownerId: 'other-rep-id' })
    const caller = makeCallerSalesRep({ sub: 'rep-user-id' })

    // Act & Assert
    await expect(
      service.updateContact(caller, 'contact-id', { firstName: 'Hacked' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('contacts-unit-10: manager can edit any contact in the org', async () => {
    // Arrange
    const updatedContact = { ...mockContact, ownerId: 'someone-else', firstName: 'Updated' }
    vi.mocked(repo.findById).mockResolvedValue({ ...mockContact, ownerId: 'someone-else' })
    vi.mocked(repo.update).mockResolvedValue(updatedContact)
    const caller = makeCallerManager()

    // Act
    const result = await service.updateContact(caller, 'contact-id', { firstName: 'Updated' })

    // Assert
    expect(result.firstName).toBe('Updated')
  })

  it('contacts-unit-16: sales rep cannot reassign owner', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(mockContact)
    const caller = makeCallerSalesRep({ sub: 'rep-user-id' })

    // Act & Assert
    await expect(
      service.updateContact(caller, 'contact-id', { ownerId: 'other-user-id' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('contacts-unit-17: throws ConflictError when updating to an already-taken email', async () => {
    // Arrange
    const anotherContact = { ...mockContact, id: 'other-contact-id', email: 'taken@co.com' }
    vi.mocked(repo.findById).mockResolvedValue(mockContact)
    vi.mocked(repo.findByEmail).mockResolvedValue(anotherContact)
    const caller = makeCallerAdmin()

    // Act & Assert
    await expect(
      service.updateContact(caller, 'contact-id', { email: 'taken@co.com' }),
    ).rejects.toThrow(ConflictError)
  })
})

describe('contactService.deleteContact', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('contacts-unit-11: admin can soft-delete a contact', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(mockContact)
    vi.mocked(repo.softDelete).mockResolvedValue(undefined)
    const caller = makeCallerAdmin()

    // Act
    await service.deleteContact(caller, 'contact-id')

    // Assert
    expect(repo.softDelete).toHaveBeenCalledWith('org-id', 'contact-id')
  })

  it('contacts-unit-12: throws ForbiddenError when manager attempts to delete', async () => {
    // Arrange
    const caller = makeCallerManager()

    // Act & Assert
    await expect(service.deleteContact(caller, 'contact-id')).rejects.toThrow(ForbiddenError)
    expect(repo.softDelete).not.toHaveBeenCalled()
  })

  it('contacts-unit-12b: throws ForbiddenError when sales_rep attempts to delete', async () => {
    // Arrange
    const caller = makeCallerSalesRep()

    // Act & Assert
    await expect(service.deleteContact(caller, 'contact-id')).rejects.toThrow(ForbiddenError)
    expect(repo.softDelete).not.toHaveBeenCalled()
  })

  it('contacts-unit-18: throws NotFoundError when contact does not exist', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(undefined)
    const caller = makeCallerAdmin()

    // Act & Assert
    await expect(service.deleteContact(caller, 'no-such-id')).rejects.toThrow(NotFoundError)
  })
})
