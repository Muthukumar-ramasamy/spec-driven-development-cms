import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createStage, updateStage, deleteStage, reorderStages } from '../api'
import { getApiErrorMessage } from '../../../lib/api'

export function useStageMutations() {
  const queryClient = useQueryClient()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] })
  }

  const create = useMutation({
    mutationFn: (data: { name: string; probability?: number }) => createStage(data),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      console.error('Create stage failed:', getApiErrorMessage(err))
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; probability?: number } }) =>
      updateStage(id, data),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      console.error('Update stage failed:', getApiErrorMessage(err))
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteStage(id),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      console.error('Delete stage failed:', getApiErrorMessage(err))
    },
  })

  const reorder = useMutation({
    mutationFn: (stages: Array<{ id: string; displayOrder: number }>) => reorderStages(stages),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      console.error('Reorder stages failed:', getApiErrorMessage(err))
    },
  })

  return { create, update, remove, reorder }
}
