import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors'
import { JWTPayload } from '../../lib/auth'
import { buildPaginationMeta } from '../../lib/pagination'
import * as repo from './repository'
import type { CreateCompanyInput, UpdateCompanyInput, ListCompaniesQuery } from './schemas'

// ─── listCompanies ────────────────────────────────────────────────────────────
// BR-04: always scoped by organizationId (from JWT).
// All roles see all companies in the org (resolved open question: companies are account-level).

export async function listCompanies(caller: JWTPayload, query: ListCompaniesQuery) {
  const { data, total } = await repo.findMany(caller.organizationId, query)
  const pagination = buildPaginationMeta({ page: query.page, limit: query.limit }, total)
  return { data, pagination }
}

// ─── createCompany ────────────────────────────────────────────────────────────
// BR-01: company name must be unique within org (excludes soft-deleted).
// owner_id defaults to the calling user unless the caller is admin/manager who provides ownerId.
// Sales rep cannot assign a different owner (permissions matrix: reassign = admin/manager only).

export async function createCompany(caller: JWTPayload, input: CreateCompanyInput) {
  // BR-01: check name uniqueness within org
  const existing = await repo.findByName(caller.organizationId, input.name)
  if (existing) {
    throw new ConflictError('A company with this name already exists.')
  }

  // Ownership assignment: sales rep is always set as owner; admin/manager may specify ownerId
  const ownerId =
    caller.role === 'sales_rep' ? caller.sub : (input.ownerId ?? caller.sub)

  const company = await repo.create({
    organizationId: caller.organizationId,
    ownerId,
    name: input.name,
    website: input.website ?? null,
    industry: input.industry ?? null,
    employeeCount: input.employeeCount ?? null,
    notes: input.notes ?? null,
  })

  return company
}

// ─── getCompanyById ───────────────────────────────────────────────────────────
// BR-04: org-scoped lookup.
// All roles may view any company detail.
// Returns contacts[] and deals[] as empty arrays (those modules not yet implemented).

export async function getCompanyById(caller: JWTPayload, id: string) {
  const company = await repo.findById(caller.organizationId, id)
  if (!company) throw new NotFoundError('Company')

  return {
    ...company,
    contacts: [] as unknown[],
    deals: [] as unknown[],
  }
}

// ─── updateCompany ────────────────────────────────────────────────────────────
// BR-03: sales rep can only edit companies they own; managers/admins can edit any.
// Sales rep cannot reassign owner (permissions matrix).
// BR-01: name uniqueness check when the name is being changed.

export async function updateCompany(
  caller: JWTPayload,
  id: string,
  input: UpdateCompanyInput,
) {
  const company = await repo.findById(caller.organizationId, id)
  if (!company) throw new NotFoundError('Company')

  // BR-03: sales rep can only edit companies they own
  if (caller.role === 'sales_rep' && company.ownerId !== caller.sub) {
    throw new ForbiddenError('You do not have permission to edit this company.')
  }

  // Sales rep cannot reassign the owner
  if (caller.role === 'sales_rep' && input.ownerId !== undefined) {
    throw new ForbiddenError('You do not have permission to edit this company.')
  }

  // BR-01: name uniqueness check when name is being changed
  if (input.name !== undefined && input.name !== company.name) {
    const duplicate = await repo.findByName(caller.organizationId, input.name)
    if (duplicate && duplicate.id !== id) {
      throw new ConflictError('A company with this name already exists.')
    }
  }

  // Build partial update payload — only include fields that were provided
  const updates: Parameters<typeof repo.update>[2] = {}
  if (input.name !== undefined) updates.name = input.name
  if ('website' in input) updates.website = input.website ?? null
  if ('industry' in input) updates.industry = input.industry ?? null
  if ('employeeCount' in input) updates.employeeCount = input.employeeCount ?? null
  if ('notes' in input) updates.notes = input.notes ?? null
  if (input.ownerId !== undefined) updates.ownerId = input.ownerId

  const updated = await repo.update(caller.organizationId, id, updates)
  if (!updated) throw new NotFoundError('Company')

  return updated
}

// ─── deleteCompany ────────────────────────────────────────────────────────────
// Permissions matrix: only admins can delete companies.
// BR-02: soft-delete the company, then set company_id = NULL on all linked contacts.

export async function deleteCompany(caller: JWTPayload, id: string) {
  // Permissions matrix: only admins can delete
  if (caller.role !== 'admin') {
    throw new ForbiddenError('Only admins can delete companies.')
  }

  const company = await repo.findById(caller.organizationId, id)
  if (!company) throw new NotFoundError('Company')

  // Soft-delete the company record
  await repo.softDelete(caller.organizationId, id)

  // BR-02: unlink all contacts that belonged to this company
  await repo.unlinkCompanyContacts(caller.organizationId, id)
}
