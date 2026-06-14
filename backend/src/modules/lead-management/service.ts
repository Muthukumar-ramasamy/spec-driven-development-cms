import { ForbiddenError, NotFoundError, UnprocessableError } from '../../lib/errors'
import { JWTPayload } from '../../lib/auth'
import { buildPaginationMeta } from '../../lib/pagination'
import { db } from '../../db'
import * as repo from './repository'
import type { CreateLeadInput, UpdateLeadInput, ConvertLeadInput, ListLeadsQuery } from './schemas'

// ─── listLeads ────────────────────────────────────────────────────────────────
// BR-03: Sales reps always see only their own leads (ownerId forced to caller.sub).
// BR-04: Default status filter is 'new,contacted' — excludes disqualified and converted.
// Managers/admins can optionally filter by ownerId and override the status filter.

export async function listLeads(caller: JWTPayload, query: ListLeadsQuery) {
  // BR-03: Force ownerId for sales_rep — they cannot see other reps' leads
  const effectiveOwnerId =
    caller.role === 'sales_rep' ? caller.sub : (query.ownerId ?? undefined)

  // BR-04: Default status filter excludes disqualified and converted
  const statusList: string[] =
    query.status
      ? query.status.split(',').map((s) => s.trim()).filter(Boolean)
      : ['new', 'contacted']

  const { data, total } = await repo.findMany(caller.organizationId, {
    ...query,
    ownerId: effectiveOwnerId,
    statusList,
  })

  const pagination = buildPaginationMeta({ page: query.page, limit: query.limit }, total)
  return { data, pagination }
}

// ─── createLead ───────────────────────────────────────────────────────────────
// Status is always 'new' on creation — never overridden by input.
// Sales rep is always the owner of their own leads.
// Admin/manager can specify ownerId; defaults to caller.sub if not provided.

export async function createLead(caller: JWTPayload, input: CreateLeadInput) {
  // Ownership assignment: sales_rep is always the owner; admin/manager may specify
  const ownerId =
    caller.role === 'sales_rep' ? caller.sub : (input.ownerId ?? caller.sub)

  const lead = await repo.create({
    organizationId: caller.organizationId,
    title: input.title,
    value: input.value !== undefined ? String(input.value) : '0',
    status: 'new',
    source: input.source ?? null,
    ownerId,
    contactId: input.contactId ?? null,
    companyId: input.companyId ?? null,
  })

  return lead
}

// ─── getLeadById ─────────────────────────────────────────────────────────────
// BR-03: Sales rep can only view their own leads.

export async function getLeadById(caller: JWTPayload, id: string) {
  const lead = await repo.findById(caller.organizationId, id)
  if (!lead) throw new NotFoundError('Lead')

  // BR-03: sales_rep cannot view another rep's lead
  if (caller.role === 'sales_rep' && lead.ownerId !== caller.sub) {
    throw new ForbiddenError('You do not have permission to view this lead.')
  }

  return lead
}

// ─── updateLead ───────────────────────────────────────────────────────────────
// BR-03: sales_rep can only update their own leads.
// Sales rep cannot reassign ownerId (permissions matrix).
// status = 'converted' cannot be set via update — use the /convert endpoint.

export async function updateLead(
  caller: JWTPayload,
  id: string,
  input: UpdateLeadInput,
) {
  const lead = await repo.findById(caller.organizationId, id)
  if (!lead) throw new NotFoundError('Lead')

  // BR-03: sales_rep can only edit their own leads
  if (caller.role === 'sales_rep' && lead.ownerId !== caller.sub) {
    throw new ForbiddenError('You do not have permission to edit this lead.')
  }

  // Sales rep cannot reassign the owner
  if (caller.role === 'sales_rep' && input.ownerId !== undefined) {
    throw new ForbiddenError('You do not have permission to reassign lead ownership.')
  }

  // Build partial update payload — only include provided fields
  const updates: Parameters<typeof repo.update>[2] = {}
  if (input.title !== undefined) updates.title = input.title
  if ('value' in input) updates.value = input.value !== null && input.value !== undefined ? String(input.value) : null
  if (input.status !== undefined) updates.status = input.status
  if ('source' in input) updates.source = input.source ?? null
  if ('contactId' in input) updates.contactId = input.contactId ?? null
  if ('companyId' in input) updates.companyId = input.companyId ?? null
  if (input.ownerId !== undefined) updates.ownerId = input.ownerId

  const updated = await repo.update(caller.organizationId, id, updates)
  if (!updated) throw new NotFoundError('Lead')

  return updated
}

// ─── deleteLead ───────────────────────────────────────────────────────────────
// Permissions matrix: admin only.
// BR-02: Converted leads cannot be deleted — retained as audit trail.

export async function deleteLead(caller: JWTPayload, id: string) {
  // Permissions matrix: only admins can delete
  if (caller.role !== 'admin') {
    throw new ForbiddenError('Only admins can delete leads.')
  }

  const lead = await repo.findById(caller.organizationId, id)
  if (!lead) throw new NotFoundError('Lead')

  // BR-02: converted leads are retained as an audit trail — never deleted
  if (lead.status === 'converted') {
    throw new ForbiddenError('Converted leads cannot be deleted.')
  }

  await repo.softDelete(caller.organizationId, id)
}

// ─── convertLead ─────────────────────────────────────────────────────────────
// BR-01: Cannot convert a lead that is already converted (422).
// BR-03: sales_rep can only convert their own leads.
// BR-05: stageId is required — enforced by Zod schema before reaching this function.
// The deals table may not exist yet (created by deal-pipeline-management).
// We attempt to create a minimal deal stub; if the table doesn't exist we still
// mark the lead as converted but set convertedDealId = null.

export async function convertLead(
  caller: JWTPayload,
  id: string,
  input: ConvertLeadInput,
) {
  const lead = await repo.findById(caller.organizationId, id)
  if (!lead) throw new NotFoundError('Lead')

  // BR-03: sales_rep can only convert their own leads
  if (caller.role === 'sales_rep' && lead.ownerId !== caller.sub) {
    throw new ForbiddenError('You do not have permission to convert this lead.')
  }

  // BR-01: Cannot convert an already-converted lead
  if (lead.status === 'converted') {
    throw new UnprocessableError('This lead has already been converted.')
  }

  // Attempt to create a deal stub. The deals table may not exist yet.
  // If the insert fails (table does not exist), we proceed with convertedDealId = null.
  let dealRecord: { id: string; title: string; stageId: string } | null = null
  let dealId: string | null = null

  try {
    const dealResult = await db.execute<{ id: string; title: string; stage_id: string }>(
      {
        sql: `
          INSERT INTO deals (
            id,
            organization_id,
            title,
            value,
            stage_id,
            owner_id,
            contact_id,
            company_id,
            lead_id,
            status,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            'open',
            NOW(),
            NOW()
          )
          RETURNING id, title, stage_id
        `,
        params: [
          caller.organizationId,
          lead.title,
          lead.value ?? '0',
          input.stageId,
          lead.ownerId,
          lead.contactId ?? null,
          lead.companyId ?? null,
          lead.id,
        ],
      },
    )

    const row = (dealResult as unknown as { rows: Array<{ id: string; title: string; stage_id: string }> }).rows[0]
    if (row) {
      dealId = row.id
      dealRecord = { id: row.id, title: row.title, stageId: row.stage_id }
    }
  } catch {
    // Deals table does not exist yet — convert lead without linking a deal.
    // deal-pipeline-management migration will create the deals table later.
    dealId = null
    dealRecord = null
  }

  // Mark the lead as converted and optionally link the deal
  const updatedLead = await repo.convertLead(caller.organizationId, id, dealId)
  if (!updatedLead) throw new NotFoundError('Lead')

  return { lead: updatedLead, deal: dealRecord }
}
