import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors'
import { JWTPayload } from '../../lib/auth'
import { buildPaginationMeta } from '../../lib/pagination'
import * as repo from './repository'
import type { CreateContactInput, UpdateContactInput, ListContactsQuery } from './schemas'

export async function listContacts(caller: JWTPayload, query: ListContactsQuery) {
  // BR-04 (scoping): sales rep only sees their own contacts
  const ownerId = caller.role === 'sales_rep' ? caller.sub : query.ownerId

  const { data, total } = await repo.findMany(caller.organizationId, {
    ...query,
    ownerId,
  })

  const pagination = buildPaginationMeta({ page: query.page, limit: query.limit }, total)
  return { data, pagination }
}

export async function createContact(caller: JWTPayload, input: CreateContactInput) {
  // BR-01: email must be unique within org (when provided)
  if (input.email) {
    const existing = await repo.findByEmail(caller.organizationId, input.email)
    if (existing) {
      throw new ConflictError('A contact with this email already exists.')
    }
  }

  // Sales rep cannot assign a different owner (permissions matrix: reassign = admin/manager only)
  const ownerId = caller.role === 'sales_rep' ? caller.sub : (input.ownerId ?? caller.sub)

  const contact = await repo.create({
    organizationId: caller.organizationId,
    ownerId,
    createdBy: caller.sub,
    companyId: input.companyId ?? null,
    firstName: input.firstName,
    lastName: input.lastName ?? null,
    email: input.email ? input.email.toLowerCase() : null,
    phone: input.phone ?? null,
    jobTitle: input.jobTitle ?? null,
    linkedinUrl: input.linkedinUrl ?? null,
    source: input.source ?? 'manual',
  })

  return contact
}

export async function getContactById(caller: JWTPayload, id: string) {
  const contact = await repo.findById(caller.organizationId, id)
  if (!contact) throw new NotFoundError('Contact')

  // Sales rep can only view contacts they own
  if (caller.role === 'sales_rep' && contact.ownerId !== caller.sub) {
    throw new ForbiddenError()
  }

  return {
    ...contact,
    deals: [] as unknown[],
    activities: [] as unknown[],
    notes: [] as unknown[],
  }
}

export async function updateContact(
  caller: JWTPayload,
  id: string,
  input: UpdateContactInput,
) {
  const contact = await repo.findById(caller.organizationId, id)
  if (!contact) throw new NotFoundError('Contact')

  // BR-03: sales rep can only edit contacts they own
  if (caller.role === 'sales_rep' && contact.ownerId !== caller.sub) {
    throw new ForbiddenError()
  }

  // Sales rep cannot reassign owner
  if (caller.role === 'sales_rep' && input.ownerId !== undefined) {
    throw new ForbiddenError()
  }

  // BR-01: email uniqueness check when changing email
  const newEmail = input.email || null
  if (newEmail && newEmail !== contact.email) {
    const existing = await repo.findByEmail(caller.organizationId, newEmail)
    if (existing && existing.id !== id) {
      throw new ConflictError('A contact with this email already exists.')
    }
  }

  const updates: Partial<Omit<typeof contact, 'id' | 'organizationId' | 'createdAt' | 'createdBy' | 'ownerName' | 'companyName'>> = {}
  if (input.firstName !== undefined) updates.firstName = input.firstName
  if ('lastName' in input) updates.lastName = input.lastName ?? null
  if ('email' in input) updates.email = newEmail
  if ('phone' in input) updates.phone = input.phone ?? null
  if ('jobTitle' in input) updates.jobTitle = input.jobTitle ?? null
  if ('linkedinUrl' in input) updates.linkedinUrl = input.linkedinUrl ?? null
  if ('companyId' in input) updates.companyId = input.companyId ?? null
  if (input.ownerId !== undefined) updates.ownerId = input.ownerId

  const updated = await repo.update(caller.organizationId, id, updates)
  if (!updated) throw new NotFoundError('Contact')

  return updated
}

export async function deleteContact(caller: JWTPayload, id: string) {
  // BR-02 + permissions matrix: only admins can delete contacts
  if (caller.role !== 'admin') {
    throw new ForbiddenError()
  }

  const contact = await repo.findById(caller.organizationId, id)
  if (!contact) throw new NotFoundError('Contact')

  // BR-02: soft delete only — never hard delete
  await repo.softDelete(caller.organizationId, id)
}
