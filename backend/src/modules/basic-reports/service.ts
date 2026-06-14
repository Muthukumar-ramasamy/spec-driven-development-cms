import { ValidationError, NotFoundError } from '../../lib/errors'
import type { JWTPayload } from '../../lib/auth'
import * as repo from './repository'
import type { ReportQuery, PipelineValueQuery } from './schemas'
import type {
  DealsReportData,
  PipelineValueData,
  ActivitiesReportData,
  LeadsBySourceData,
} from './schemas'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Return default date range: [30 days ago, today] as Date objects. */
function defaultDateRange(): { startDate: Date; endDate: Date } {
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)          // inclusive end-of-day
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  startDate.setHours(0, 0, 0, 0)             // inclusive start-of-day
  return { startDate, endDate }
}

/**
 * Parse and validate startDate/endDate strings.
 * - Invalid format → ValidationError (400)
 * - startDate after endDate → ValidationError (400)
 * Returns Date objects spanning the full start-of-day to end-of-day.
 */
function parseDateRange(
  startDateStr?: string,
  endDateStr?: string,
): { startDate: Date; endDate: Date } {
  const { startDate: defaultStart, endDate: defaultEnd } = defaultDateRange()

  const startDate = startDateStr ? new Date(startDateStr + 'T00:00:00.000Z') : defaultStart
  const endDate   = endDateStr   ? new Date(endDateStr   + 'T23:59:59.999Z') : defaultEnd

  // Guard: NaN dates (malformed strings that bypass regex in some edge paths)
  if (isNaN(startDate.getTime())) {
    throw new ValidationError('Invalid date format. Use ISO8601 (YYYY-MM-DD).')
  }
  if (isNaN(endDate.getTime())) {
    throw new ValidationError('Invalid date format. Use ISO8601 (YYYY-MM-DD).')
  }

  // BR-04 + AC-01: startDate must not be after endDate
  if (startDate > endDate) {
    throw new ValidationError('startDate must be before or equal to endDate.')
  }

  return { startDate, endDate }
}

/**
 * Resolve the effective ownerId for a report query.
 *
 * BR-02: sales_rep role → ownerId is ALWAYS overridden to caller.sub (never 403).
 * Manager / Admin → ownerId param is respected (or undefined = all-org data).
 * Validates that a supplied ownerId belongs to the caller's org (404 if not).
 */
async function resolveOwnerId(
  caller: JWTPayload,
  requestedOwnerId?: string,
): Promise<string | undefined> {
  // BR-02: Sales Rep can only see their own data
  if (caller.role === 'sales_rep') {
    return caller.sub   // silently override — never 403
  }

  // Manager / Admin: validate ownerId if supplied
  if (requestedOwnerId) {
    const user = await repo.findUserInOrg(caller.organizationId, requestedOwnerId)
    if (!user) {
      throw new NotFoundError('User')  // 404 per error cases spec
    }
    return requestedOwnerId
  }

  return undefined   // no filter → all-org data for manager/admin
}

// ─────────────────────────────────────────────────────────────────────────────
// DEALS REPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BR-01: Org-scoped.
 * BR-02: Sales Rep sees own data only.
 * BR-04: Default date range = last 30 days.
 * AC-01: Deals filtered by won_at / lost_at within date range.
 */
export async function getDealsReport(
  caller: JWTPayload,
  query: ReportQuery,
): Promise<DealsReportData> {
  const { startDate, endDate } = parseDateRange(query.startDate, query.endDate)
  const ownerId = await resolveOwnerId(caller, query.ownerId)

  return repo.getDealsReport({
    organizationId: caller.organizationId, // from JWT only — never from request body
    startDate,
    endDate,
    ownerId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE VALUE REPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BR-01: Org-scoped.
 * BR-02: Sales Rep sees own data only.
 * AC-02: Only status='open' deals.
 * AC-03: Grouped by stage in display_order order.
 * No date range filter (current open pipeline snapshot).
 */
export async function getPipelineValueReport(
  caller: JWTPayload,
  query: PipelineValueQuery,
): Promise<PipelineValueData> {
  const ownerId = await resolveOwnerId(caller, query.ownerId)

  return repo.getPipelineValueReport({
    organizationId: caller.organizationId, // from JWT only
    ownerId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITIES REPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BR-01: Org-scoped.
 * BR-02: Sales Rep sees own data only.
 * BR-04: Default date range = last 30 days.
 * AC-04: Activities filtered by created_at within date range.
 */
export async function getActivitiesReport(
  caller: JWTPayload,
  query: ReportQuery,
): Promise<ActivitiesReportData> {
  const { startDate, endDate } = parseDateRange(query.startDate, query.endDate)
  const ownerId = await resolveOwnerId(caller, query.ownerId)

  return repo.getActivitiesReport({
    organizationId: caller.organizationId, // from JWT only
    startDate,
    endDate,
    ownerId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADS BY SOURCE REPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BR-01: Org-scoped.
 * BR-02: Sales Rep sees own data only.
 * BR-04: Default date range = last 30 days.
 * AC-05: Lead counts grouped by source enum value.
 */
export async function getLeadsBySourceReport(
  caller: JWTPayload,
  query: ReportQuery,
): Promise<LeadsBySourceData> {
  const { startDate, endDate } = parseDateRange(query.startDate, query.endDate)
  const ownerId = await resolveOwnerId(caller, query.ownerId)

  return repo.getLeadsBySourceReport({
    organizationId: caller.organizationId, // from JWT only
    startDate,
    endDate,
    ownerId,
  })
}
