import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLead, updateLead, deleteLead, convertLead } from '../api'
import { getApiErrorMessage } from '../../../lib/api'
import type { CreateLeadFormValues, UpdateLeadFormValues } from '../schemas'

export function useLeadMutations() {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: (data: CreateLeadFormValues) =>
      createLead(data as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: (err: unknown) => {
      console.error('Failed to create lead:', getApiErrorMessage(err))
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadFormValues }) =>
      updateLead(id, data as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: (err: unknown) => {
      console.error('Failed to update lead:', getApiErrorMessage(err))
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: (err: unknown) => {
      console.error('Failed to delete lead:', getApiErrorMessage(err))
    },
  })

  const convert = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      convertLead(id, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: (err: unknown) => {
      console.error('Failed to convert lead:', getApiErrorMessage(err))
    },
  })

  return { create, update, remove, convert }
}
