import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors'
import { JWTPayload } from '../../lib/auth'
import { buildPaginationMeta } from '../../lib/pagination'
import * as repo from './repository'
import type {
  CreateActivityInput,
  UpdateActivityInput,
  MarkDoneInput,
  ListActivitiesQuery,
} from './schemas'

// ─── listActivities ───────────────────────────────────────────────────────────
// BR-05: Sales rep is always forced to their own ownerId — cannot see other reps' activities.
// Manager/admin can filter by ownerId or see all activities in the org.

export async function listActivities(caller: JWTPayload, query: ListActivitiesQuery) {
  // BR-05: Force ownerId for sales_rep — they cannot see other reps' activities
  const effectiveOwnerId =
    caller.role === 'sales_rep' ? caller.sub : (query.ownerId ?? undefined)

  // Coerce done string ('true'/'false') to boolean for repository filter
  const doneFilter: boolean | undefined =
    query.done === 'true' ? true : query.done === 'false' ? false : undefined

  const { data, total } = await repo.findMany(caller.organizationId, {
    ...query,
    ownerId: effectiveOwnerId,
    done: doneFilter,
  })

  const pagination = buildPaginationMeta({ page: query.page, limit: query.limit }, total)
  return { data, pagination }
}

// ─── createActivity ───────────────────────────────────────────────────────────
// BR-01: At least one linked record (deal, contact, company, or lead) is required.
// BR-05: sales_rep is always the owner; admin/manager may specify ownerId.
// AC-01: If done=true and doneAt not provided, set doneAt to current timestamp.

export async function createActivity(caller: JWTPayload, input: CreateActivityInput) {
  // BR-01: At least one linked record must be present
  if (!input.dealId && !input.contactId && !input.companyId && !input.leadId) {
    throw new ValidationError('An activity must be linked to at least one record.')
  }

  // Ownership: sales_rep always owns their own activities; admin/manager may specify
  const ownerId =
    caller.role === 'sales_rep' ? caller.sub : (input.ownerId ?? caller.sub)

  // AC-01: Auto-set doneAt when done=true and caller did not provide it
  const doneAt =
    input.done === true && !input.doneAt ? new Date() : input.doneAt ? new Date(input.doneAt) : null

  const activity = await repo.create({
    organizationId: caller.organizationId,
    type: input.type,
    subject: input.subject,
    notes: input.notes ?? null,
    done: input.done ?? false,
    doneAt,
    dueDate: input.dueDate ?? null,
    ownerId,
    dealId: input.dealId ?? null,
    contactId: input.contactId ?? null,
    companyId: input.companyId ?? null,
    leadId: input.leadId ?? null,
  })

  return activity
}

// ─── getActivityById ─────────────────────────────────────────────────────────
// BR-05: Sales rep can only view activities they own.

export async function getActivityById(caller: JWTPayload, id: string) {
  const activity = await repo.findById(caller.organizationId, id)
  if (!activity) throw new NotFoundError('Activity')

  // BR-05: sales_rep cannot view another rep's activity
  if (caller.role === 'sales_rep' && activity.ownerId !== caller.sub) {
    throw new ForbiddenError('You do not have permission to view this activity.')
  }

  return activity
}

// ─── updateActivity ───────────────────────────────────────────────────────────
// Only type, subject, notes, and dueDate may be updated via PUT.
// done and doneAt are NOT updatable here — use the /done endpoint.
// BR-05: sales_rep can only update activities they own.

export async function updateActivity(
  caller: JWTPayload,
  id: string,
  input: UpdateActivityInput,
) {
  const activity = await repo.findById(caller.organizationId, id)
  if (!activity) throw new NotFoundError('Activity')

  // BR-05: sales_rep can only edit their own activities
  if (caller.role === 'sales_rep' && activity.ownerId !== caller.sub) {
    throw new ForbiddenError('You do not have permission to edit this activity.')
  }

  // Build partial update — only include explicitly provided fields
  const patch: Parameters<typeof repo.update>[2] = {}
  if (input.type !== undefined) patch.type = input.type
  if (input.subject !== undefined) patch.subject = input.subject
  if ('notes' in input) patch.notes = input.notes ?? null
  if ('dueDate' in input) patch.dueDate = input.dueDate ?? null

  const updated = await repo.update(caller.organizationId, id, patch)
  if (!updated) throw new NotFoundError('Activity')

  return updated
}

// ─── deleteActivity ───────────────────────────────────────────────────────────
// BR-05: sales_rep can only soft-delete their own activities.
// Manager/admin can delete any activity within the org.

export async function deleteActivity(caller: JWTPayload, id: string) {
  const activity = await repo.findById(caller.organizationId, id)
  if (!activity) throw new NotFoundError('Activity')

  // BR-05: sales_rep can only delete their own activities
  if (caller.role === 'sales_rep' && activity.ownerId !== caller.sub) {
    throw new ForbiddenError('You do not have permission to delete this activity.')
  }

  await repo.softDelete(caller.organizationId, id)
}

// ─── markActivityDone ─────────────────────────────────────────────────────────
// BR-02: done is irreversible — throws ValidationError if already done.
// BR-05: sales_rep can only mark their own activities as done.

export async function markActivityDone(caller: JWTPayload, id: string, input: MarkDoneInput) {
  const activity = await repo.findById(caller.organizationId, id)
  if (!activity) throw new NotFoundError('Activity')

  // BR-05: sales_rep can only mark their own activities as done
  if (caller.role === 'sales_rep' && activity.ownerId !== caller.sub) {
    throw new ForbiddenError('You do not have permission to mark this activity as done.')
  }

  // BR-02: done is irreversible
  if (activity.done === true) {
    throw new ValidationError('This activity is already marked as done.')
  }

  const updated = await repo.markDone(caller.organizationId, id, input.notes)
  if (!updated) throw new NotFoundError('Activity')

  return updated
}
