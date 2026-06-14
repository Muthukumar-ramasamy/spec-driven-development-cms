import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as notesApi from '../api'
import type { CreateNoteInput, UpdateNoteInput } from '../schemas'
import { getApiErrorMessage } from '../../../lib/api'

export function useNoteMutations() {
  const queryClient = useQueryClient()

  // Invalidate all note queries (any filter combination) on any mutation.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notes'] })

  const create = useMutation({
    mutationFn: (data: CreateNoteInput) => notesApi.createNote(data),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      // Error surfaces via the component; hook just ensures cache stays clean.
      console.error('createNote failed:', getApiErrorMessage(err))
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteInput }) =>
      notesApi.updateNote(id, data),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      console.error('updateNote failed:', getApiErrorMessage(err))
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => notesApi.deleteNote(id),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      console.error('deleteNote failed:', getApiErrorMessage(err))
    },
  })

  return { create, update, remove }
}
