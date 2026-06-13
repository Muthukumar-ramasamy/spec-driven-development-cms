import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as contactApi from '../api'
import type { UpdateContactFormValues } from '../schemas'

export function useContactMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contacts'] })

  const create = useMutation({
    mutationFn: contactApi.createContact,
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactFormValues }) =>
      contactApi.updateContact(id, data),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: contactApi.deleteContact,
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
