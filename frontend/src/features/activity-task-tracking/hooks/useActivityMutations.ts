import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createActivity, updateActivity, deleteActivity, markActivityDone } from '../api'
import { getApiErrorMessage } from '../../../lib/api'
import type { CreateActivityFormValues, UpdateActivityFormValues } from '../schemas'

export function useActivityMutations() {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['activities'] })

  const create = useMutation({
    mutationFn: (data: CreateActivityFormValues) => createActivity(data),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateActivityFormValues }) =>
      updateActivity(id, data),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: invalidate,
  })

  const markDone = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      markActivityDone(id, notes),
    onSuccess: invalidate,
  })

  return { create, update, remove, markDone, getApiErrorMessage }
}
