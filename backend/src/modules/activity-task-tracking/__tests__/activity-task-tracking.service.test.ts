import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors'
import * as service from '../service'
import * as repo from '../repository'

vi.mock('../repository')

// ---------------------------------------------------------------------------
// Caller factories
// ---------------------------------------------------------------------------

const makeAdmin = (overrides = {}) => ({
  sub: 'admin-user-id',
  organizationId: 'org-id',
  role: 'admin' as const,
  ...overrides,
})

const makeManager = (overrides = {}) => ({
  sub: 'manager-user-id',
  organizationId: 'org-id',
  role: 'manager' as const,
  ...overrides,
})

const makeSalesRep = (overrides = {}) => ({
  sub: 'rep-user-id',
  organizationId: 'org-id',
  role: 'sales_rep' as const,
  ...overrides,
})

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const baseActivity = {
  id: 'activity-id',
  organizationId: 'org-id',
  type: 'call' as const,
  subject: 'Follow-up call',
  notes: null,
  done: false,
  doneAt: null,
  dueDate: '2026-07-01',
  ownerId: 'rep-user-id',
  dealId: 'deal-id',
  contactId: null,
  companyId: null,
  leadId: null,
  ownerName: 'Rep User',
  createdAt: new Date('2026-06-13T10:00:00Z'),
  updatedAt: new Date('2026-06-13T10:00:00Z'),
  deletedAt: null,
}

const baseQuery = {
  page: 1,
  limit: 20,
  sort: 'created_at' as const,
  order: 'desc' as const,
}

// ---------------------------------------------------------------------------
// listActivities
// ---------------------------------------------------------------------------

describe('activityService.listActivities', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('activity-unit-01: sales rep ownerId is forced to caller.sub (BR-05)', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [baseActivity], total: 1 })
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act
    await service.listActivities(caller, { ...baseQuery, ownerId: 'other-rep-id' })

    // Assert — ownerId overridden to caller.sub regardless of query param
    expect(repo.findMany).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({ ownerId: 'rep-user-id' }),
    )
  })

  it('activity-unit-02: manager sees all org activities (no forced ownerId)', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [], total: 0 })
    const caller = makeManager()

    // Act
    await service.listActivities(caller, { ...baseQuery, ownerId: undefined })

    // Assert — ownerId is NOT forced for manager
    expect(repo.findMany).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({ ownerId: undefined }),
    )
  })

  it('activity-unit-03: admin can filter by any ownerId', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [], total: 0 })
    const caller = makeAdmin()

    // Act
    await service.listActivities(caller, { ...baseQuery, ownerId: 'specific-rep-id' })

    // Assert — supplied ownerId is passed through for admin
    expect(repo.findMany).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({ ownerId: 'specific-rep-id' }),
    )
  })

  it('activity-unit-04: done string "false" is coerced to boolean false', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [], total: 0 })
    const caller = makeAdmin()

    // Act
    await service.listActivities(caller, { ...baseQuery, done: 'false' as const })

    // Assert
    expect(repo.findMany).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({ done: false }),
    )
  })

  it('activity-unit-05: done string "true" is coerced to boolean true', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [], total: 0 })
    const caller = makeAdmin()

    // Act
    await service.listActivities(caller, { ...baseQuery, done: 'true' as const })

    // Assert
    expect(repo.findMany).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({ done: true }),
    )
  })

  it('activity-unit-06: returns pagination meta alongside data', async () => {
    // Arrange
    vi.mocked(repo.findMany).mockResolvedValue({ data: [baseActivity], total: 1 })
    const caller = makeAdmin()

    // Act
    const result = await service.listActivities(caller, baseQuery)

    // Assert
    expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 1 })
    expect(result.data).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// createActivity
// ---------------------------------------------------------------------------

describe('activityService.createActivity', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('activity-unit-07: creates a logged activity with done=true and sets doneAt automatically (AC-01)', async () => {
    // Arrange
    const doneActivity = { ...baseActivity, done: true, doneAt: new Date() }
    vi.mocked(repo.create).mockResolvedValue(doneActivity)
    const caller = makeSalesRep()

    // Act
    const result = await service.createActivity(caller, {
      type: 'call',
      subject: 'Discovery call',
      done: true,
      dealId: 'deal-id',
    })

    // Assert
    expect(result.done).toBe(true)
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        done: true,
        doneAt: expect.any(Date), // auto-set by service
        ownerId: 'rep-user-id',
      }),
    )
  })

  it('activity-unit-08: creates a task with done=false (AC-02)', async () => {
    // Arrange
    vi.mocked(repo.create).mockResolvedValue(baseActivity)
    const caller = makeSalesRep()

    // Act
    const result = await service.createActivity(caller, {
      type: 'call',
      subject: 'Follow-up call',
      done: false,
      dueDate: '2026-07-01',
      dealId: 'deal-id',
    })

    // Assert
    expect(result.done).toBe(false)
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        done: false,
        doneAt: null,
        dueDate: '2026-07-01',
      }),
    )
  })

  it('activity-unit-09: throws ValidationError when no linked record (AC-03, BR-01)', async () => {
    // Arrange
    const caller = makeSalesRep()

    // Act & Assert
    await expect(
      service.createActivity(caller, {
        type: 'call',
        subject: 'Orphan activity',
        // No dealId, contactId, companyId, or leadId
      }),
    ).rejects.toThrow(ValidationError)

    expect(repo.create).not.toHaveBeenCalled()
  })

  it('activity-unit-10: ValidationError message for no linked record is correct (BR-01)', async () => {
    // Arrange
    const caller = makeSalesRep()

    // Act & Assert
    await expect(
      service.createActivity(caller, { type: 'call', subject: 'No link' }),
    ).rejects.toThrow('An activity must be linked to at least one record.')
  })

  it('activity-unit-11: sales rep ownerId is forced to caller.sub (BR-05)', async () => {
    // Arrange
    vi.mocked(repo.create).mockResolvedValue(baseActivity)
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act
    await service.createActivity(caller, {
      type: 'call',
      subject: 'Rep owns this',
      ownerId: 'some-other-user-id', // ignored for sales_rep
      contactId: 'contact-id',
    })

    // Assert — ownerId must be caller.sub
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'rep-user-id' }),
    )
  })

  it('activity-unit-12: admin can create activity on behalf of another user', async () => {
    // Arrange
    const activityForRep = { ...baseActivity, ownerId: 'other-rep-id' }
    vi.mocked(repo.create).mockResolvedValue(activityForRep)
    const caller = makeAdmin()

    // Act
    await service.createActivity(caller, {
      type: 'email',
      subject: 'Email on behalf',
      ownerId: 'other-rep-id',
      contactId: 'contact-id',
    })

    // Assert
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'other-rep-id' }),
    )
  })

  it('activity-unit-13: activity linked to contactId only is accepted (BR-01)', async () => {
    // Arrange
    vi.mocked(repo.create).mockResolvedValue({ ...baseActivity, contactId: 'contact-id', dealId: null })
    const caller = makeSalesRep()

    // Act
    const result = await service.createActivity(caller, {
      type: 'email',
      subject: 'Email follow-up',
      contactId: 'contact-id',
    })

    // Assert — no error thrown
    expect(result).toBeDefined()
    expect(repo.create).toHaveBeenCalled()
  })

  it('activity-unit-14: done=true with explicit doneAt uses provided doneAt', async () => {
    // Arrange
    const explicitDate = '2026-06-01T09:00:00Z'
    vi.mocked(repo.create).mockResolvedValue({ ...baseActivity, done: true })
    const caller = makeSalesRep()

    // Act
    await service.createActivity(caller, {
      type: 'meeting',
      subject: 'Past meeting',
      done: true,
      doneAt: explicitDate,
      contactId: 'contact-id',
    })

    // Assert — service uses the provided doneAt
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        doneAt: new Date(explicitDate),
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// getActivityById
// ---------------------------------------------------------------------------

describe('activityService.getActivityById', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('activity-unit-15: returns activity for admin regardless of ownership', async () => {
    // Arrange
    const otherRepsActivity = { ...baseActivity, ownerId: 'other-rep-id' }
    vi.mocked(repo.findById).mockResolvedValue(otherRepsActivity)
    const caller = makeAdmin()

    // Act
    const result = await service.getActivityById(caller, 'activity-id')

    // Assert
    expect(result).toEqual(otherRepsActivity)
  })

  it('activity-unit-16: sales rep can view their own activity', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(baseActivity) // ownerId = 'rep-user-id'
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act
    const result = await service.getActivityById(caller, 'activity-id')

    // Assert
    expect(result.ownerId).toBe('rep-user-id')
  })

  it('activity-unit-17: sales rep cannot view another rep\'s activity — throws ForbiddenError', async () => {
    // Arrange
    const otherRepsActivity = { ...baseActivity, ownerId: 'other-rep-id' }
    vi.mocked(repo.findById).mockResolvedValue(otherRepsActivity)
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act & Assert
    await expect(service.getActivityById(caller, 'activity-id')).rejects.toThrow(ForbiddenError)
  })

  it('activity-unit-18: throws NotFoundError when activity does not exist', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(service.getActivityById(caller, 'no-such-id')).rejects.toThrow(NotFoundError)
  })
})

// ---------------------------------------------------------------------------
// updateActivity
// ---------------------------------------------------------------------------

describe('activityService.updateActivity', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('activity-unit-19: owner can update subject and notes', async () => {
    // Arrange
    const updated = { ...baseActivity, subject: 'Updated subject', notes: 'Some notes' }
    vi.mocked(repo.findById).mockResolvedValue(baseActivity)
    vi.mocked(repo.update).mockResolvedValue(updated)
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act
    const result = await service.updateActivity(caller, 'activity-id', {
      subject: 'Updated subject',
      notes: 'Some notes',
    })

    // Assert
    expect(result.subject).toBe('Updated subject')
    expect(repo.update).toHaveBeenCalled()
  })

  it('activity-unit-20: sales rep cannot update another rep\'s activity — throws ForbiddenError', async () => {
    // Arrange
    const otherRepsActivity = { ...baseActivity, ownerId: 'other-rep-id' }
    vi.mocked(repo.findById).mockResolvedValue(otherRepsActivity)
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act & Assert
    await expect(
      service.updateActivity(caller, 'activity-id', { subject: 'Hacked' }),
    ).rejects.toThrow(ForbiddenError)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('activity-unit-21: manager can update any activity in the org', async () => {
    // Arrange
    const otherRepsActivity = { ...baseActivity, ownerId: 'some-rep' }
    const updated = { ...otherRepsActivity, subject: 'Manager updated' }
    vi.mocked(repo.findById).mockResolvedValue(otherRepsActivity)
    vi.mocked(repo.update).mockResolvedValue(updated)
    const caller = makeManager()

    // Act
    const result = await service.updateActivity(caller, 'activity-id', { subject: 'Manager updated' })

    // Assert
    expect(result.subject).toBe('Manager updated')
  })

  it('activity-unit-22: throws NotFoundError when activity does not exist on GET', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(
      service.updateActivity(caller, 'no-such-id', { subject: 'X' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('activity-unit-23: update returns NotFoundError when repo.update returns undefined', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(baseActivity)
    vi.mocked(repo.update).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(
      service.updateActivity(caller, 'activity-id', { subject: 'Updated' }),
    ).rejects.toThrow(NotFoundError)
  })
})

// ---------------------------------------------------------------------------
// deleteActivity
// ---------------------------------------------------------------------------

describe('activityService.deleteActivity', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('activity-unit-24: admin can soft-delete any activity', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(baseActivity)
    vi.mocked(repo.softDelete).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act
    await service.deleteActivity(caller, 'activity-id')

    // Assert
    expect(repo.softDelete).toHaveBeenCalledWith('org-id', 'activity-id')
  })

  it('activity-unit-25: sales rep can soft-delete their own activity', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(baseActivity) // ownerId = 'rep-user-id'
    vi.mocked(repo.softDelete).mockResolvedValue(undefined)
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act
    await service.deleteActivity(caller, 'activity-id')

    // Assert
    expect(repo.softDelete).toHaveBeenCalledWith('org-id', 'activity-id')
  })

  it('activity-unit-26: sales rep cannot delete another rep\'s activity — throws ForbiddenError', async () => {
    // Arrange
    const otherRepsActivity = { ...baseActivity, ownerId: 'other-rep-id' }
    vi.mocked(repo.findById).mockResolvedValue(otherRepsActivity)
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act & Assert
    await expect(service.deleteActivity(caller, 'activity-id')).rejects.toThrow(ForbiddenError)
    expect(repo.softDelete).not.toHaveBeenCalled()
  })

  it('activity-unit-27: throws NotFoundError when activity does not exist', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(service.deleteActivity(caller, 'no-such-id')).rejects.toThrow(NotFoundError)
    expect(repo.softDelete).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// markActivityDone
// ---------------------------------------------------------------------------

describe('activityService.markActivityDone', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('activity-unit-28: owner marks their task done — done=true, doneAt set (AC-06)', async () => {
    // Arrange
    const doneActivity = { ...baseActivity, done: true, doneAt: new Date() }
    vi.mocked(repo.findById).mockResolvedValue(baseActivity) // done = false
    vi.mocked(repo.markDone).mockResolvedValue(doneActivity)
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act
    const result = await service.markActivityDone(caller, 'activity-id', {})

    // Assert
    expect(result.done).toBe(true)
    expect(result.doneAt).not.toBeNull()
    expect(repo.markDone).toHaveBeenCalledWith('org-id', 'activity-id', undefined)
  })

  it('activity-unit-29: marking done with outcome note passes notes to repo', async () => {
    // Arrange
    const doneActivity = { ...baseActivity, done: true, notes: 'Deal closed!', doneAt: new Date() }
    vi.mocked(repo.findById).mockResolvedValue(baseActivity)
    vi.mocked(repo.markDone).mockResolvedValue(doneActivity)
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act
    const result = await service.markActivityDone(caller, 'activity-id', { notes: 'Deal closed!' })

    // Assert
    expect(result.notes).toBe('Deal closed!')
    expect(repo.markDone).toHaveBeenCalledWith('org-id', 'activity-id', 'Deal closed!')
  })

  it('activity-unit-30: throws ValidationError when activity is already done (BR-02)', async () => {
    // Arrange
    const alreadyDone = { ...baseActivity, done: true, doneAt: new Date() }
    vi.mocked(repo.findById).mockResolvedValue(alreadyDone)
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act & Assert
    await expect(
      service.markActivityDone(caller, 'activity-id', {}),
    ).rejects.toThrow(ValidationError)
    expect(repo.markDone).not.toHaveBeenCalled()
  })

  it('activity-unit-31: ValidationError message for already-done is correct (BR-02)', async () => {
    // Arrange
    const alreadyDone = { ...baseActivity, done: true, doneAt: new Date() }
    vi.mocked(repo.findById).mockResolvedValue(alreadyDone)
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act & Assert
    await expect(
      service.markActivityDone(caller, 'activity-id', {}),
    ).rejects.toThrow('This activity is already marked as done.')
  })

  it('activity-unit-32: sales rep cannot mark another rep\'s task done — throws ForbiddenError', async () => {
    // Arrange
    const otherRepsActivity = { ...baseActivity, ownerId: 'other-rep-id' }
    vi.mocked(repo.findById).mockResolvedValue(otherRepsActivity)
    const caller = makeSalesRep({ sub: 'rep-user-id' })

    // Act & Assert
    await expect(
      service.markActivityDone(caller, 'activity-id', {}),
    ).rejects.toThrow(ForbiddenError)
    expect(repo.markDone).not.toHaveBeenCalled()
  })

  it('activity-unit-33: throws NotFoundError when activity does not exist', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(
      service.markActivityDone(caller, 'no-such-id', {}),
    ).rejects.toThrow(NotFoundError)
  })

  it('activity-unit-34: manager can mark done on any activity in the org', async () => {
    // Arrange
    const anyRepsActivity = { ...baseActivity, ownerId: 'some-rep-id' }
    const doneActivity = { ...anyRepsActivity, done: true, doneAt: new Date() }
    vi.mocked(repo.findById).mockResolvedValue(anyRepsActivity)
    vi.mocked(repo.markDone).mockResolvedValue(doneActivity)
    const caller = makeManager()

    // Act
    const result = await service.markActivityDone(caller, 'activity-id', {})

    // Assert — no ForbiddenError, markDone was called
    expect(result.done).toBe(true)
    expect(repo.markDone).toHaveBeenCalledWith('org-id', 'activity-id', undefined)
  })

  it('activity-unit-35: markDone returns NotFoundError when repo.markDone returns undefined', async () => {
    // Arrange
    vi.mocked(repo.findById).mockResolvedValue(baseActivity)
    vi.mocked(repo.markDone).mockResolvedValue(undefined)
    const caller = makeAdmin()

    // Act & Assert
    await expect(
      service.markActivityDone(caller, 'activity-id', {}),
    ).rejects.toThrow(NotFoundError)
  })
})
