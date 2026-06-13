import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as authApi from '../api'

export function useUserMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const invite = useMutation({
    mutationFn: authApi.inviteUser,
    onSuccess: invalidate,
  })

  const resendInvite = useMutation({
    mutationFn: (userId: string) => authApi.resendInvite(userId),
    onSuccess: invalidate,
  })

  const updateUser = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { role?: string; status?: string } }) =>
      authApi.updateUser(userId, data),
    onSuccess: invalidate,
  })

  const deactivate = useMutation({
    mutationFn: (userId: string) => authApi.deactivateUser(userId),
    onSuccess: invalidate,
  })

  return { invite, resendInvite, updateUser, deactivate }
}
