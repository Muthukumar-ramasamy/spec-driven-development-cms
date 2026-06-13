import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as companyApi from '../api'
import type { UpdateCompanyFormValues } from '../schemas'

export function useCompanyMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['companies'] })

  const create = useMutation({
    mutationFn: companyApi.createCompany,
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompanyFormValues }) =>
      companyApi.updateCompany(id, data),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: companyApi.deleteCompany,
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
