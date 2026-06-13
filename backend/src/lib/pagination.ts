export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function buildPaginationMeta(
  params: PaginationParams,
  total: number
): PaginationMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.ceil(total / params.limit),
  }
}

export function buildOffset(params: PaginationParams): number {
  return (params.page - 1) * params.limit
}
