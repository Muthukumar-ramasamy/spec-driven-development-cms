import { api } from '../../lib/api'
import type { Activity, PaginatedActivities, ListActivitiesFilters } from './types'
import type { CreateActivityFormValues, UpdateActivityFormValues } from './schemas'

// GET /activities — returns the full paginated envelope
export async function listActivities(filters: ListActivitiesFilters): Promise<PaginatedActivities> {
  const r = await api.get('/activities', { params: filters })
  // The envelope IS the paginated structure: { data: Activity[], pagination: {...} }
  return r.data as PaginatedActivities
}

// GET /activities/:id — returns single activity (unwrap { data: Activity } envelope)
export async function getActivity(id: string): Promise<Activity> {
  const r = await api.get(`/activities/${id}`)
  return r.data.data as Activity
}

// POST /activities — create and return the new activity
export async function createActivity(data: CreateActivityFormValues): Promise<Activity> {
  const r = await api.post('/activities', data)
  return r.data.data as Activity
}

// PUT /activities/:id — update and return the updated activity
export async function updateActivity(
  id: string,
  data: UpdateActivityFormValues,
): Promise<Activity> {
  const r = await api.put(`/activities/${id}`, data)
  return r.data.data as Activity
}

// DELETE /activities/:id — soft-delete; returns void
export async function deleteActivity(id: string): Promise<void> {
  await api.delete(`/activities/${id}`)
}

// PUT /activities/:id/done — mark a task done with an optional outcome note
export async function markActivityDone(id: string, notes?: string): Promise<Activity> {
  const r = await api.put(`/activities/${id}/done`, { notes })
  return r.data.data as Activity
}
