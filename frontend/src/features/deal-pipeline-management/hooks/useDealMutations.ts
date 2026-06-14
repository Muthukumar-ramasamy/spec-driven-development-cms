import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDeal, updateDeal, deleteDeal, markDealWon, markDealLost } from '../api'
import { getApiErrorMessage } from '../../../lib/api'
import type { CreateDealFormValues, UpdateDealFormValues } from '../schemas'

export function useDealMutations() {
  const queryClient = useQueryClient()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['deals'] })
  }

  const create = useMutation({
    mutationFn: (data: CreateDealFormValues) => createDeal(data),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      console.error('Create deal failed:', getApiErrorMessage(err))
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealFormValues }) =>
      updateDeal(id, data),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      console.error('Update deal failed:', getApiErrorMessage(err))
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteDeal(id),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      console.error('Delete deal failed:', getApiErrorMessage(err))
    },
  })

  const markWon = useMutation({
    mutationFn: (id: string) => markDealWon(id),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      console.error('Mark deal won failed:', getApiErrorMessage(err))
    },
  })

  const markLost = useMutation({
    mutationFn: ({ id, lostReason }: { id: string; lostReason: string }) =>
      markDealLost(id, lostReason),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      console.error('Mark deal lost failed:', getApiErrorMessage(err))
    },
  })

  return { create, update, remove, markWon, markLost }
}
