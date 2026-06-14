import { api } from '../../lib/api'
import type {
  PipelineStage,
  Deal,
  DealDetail,
  PaginatedDeals,
  ListDealsFilters,
} from './types'
import type { CreateDealFormValues, UpdateDealFormValues } from './schemas'

// ── Pipeline Stages ────────────────────────────────────────────────────────────
// Backend wraps all responses in { data: ... }. Use r.data.data to unwrap.

export function listStages(): Promise<PipelineStage[]> {
  return api.get<{ data: PipelineStage[] }>('/pipeline-stages').then((r) => r.data.data)
}

export function createStage(data: { name: string; probability?: number }): Promise<PipelineStage> {
  return api.post<{ data: PipelineStage }>('/pipeline-stages', data).then((r) => r.data.data)
}

export function updateStage(
  id: string,
  data: { name?: string; probability?: number },
): Promise<PipelineStage> {
  return api.put<{ data: PipelineStage }>(`/pipeline-stages/${id}`, data).then((r) => r.data.data)
}

export function deleteStage(id: string): Promise<void> {
  return api.delete(`/pipeline-stages/${id}`).then(() => undefined)
}

export function reorderStages(
  stages: Array<{ id: string; displayOrder: number }>,
): Promise<PipelineStage[]> {
  return api
    .put<{ data: PipelineStage[] }>('/pipeline-stages/reorder', { stages })
    .then((r) => r.data.data)
}

// ── Deals ──────────────────────────────────────────────────────────────────────
// listDeals returns { data: Deal[], pagination: {} } which matches PaginatedDeals directly.

export function listDeals(filters: ListDealsFilters): Promise<PaginatedDeals> {
  return api.get<PaginatedDeals>('/deals', { params: filters }).then((r) => r.data)
}

export function getDeal(id: string): Promise<DealDetail> {
  return api.get<{ data: DealDetail }>(`/deals/${id}`).then((r) => r.data.data)
}

export function createDeal(data: CreateDealFormValues): Promise<Deal> {
  return api.post<{ data: Deal }>('/deals', data).then((r) => r.data.data)
}

export function updateDeal(id: string, data: UpdateDealFormValues): Promise<Deal> {
  return api.put<{ data: Deal }>(`/deals/${id}`, data).then((r) => r.data.data)
}

export function deleteDeal(id: string): Promise<void> {
  return api.delete(`/deals/${id}`).then(() => undefined)
}

export function markDealWon(id: string): Promise<Deal> {
  return api.post<{ data: Deal }>(`/deals/${id}/won`).then((r) => r.data.data)
}

export function markDealLost(id: string, lostReason: string): Promise<Deal> {
  return api.post<{ data: Deal }>(`/deals/${id}/lost`, { lostReason }).then((r) => r.data.data)
}
