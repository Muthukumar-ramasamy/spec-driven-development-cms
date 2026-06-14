import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { setToken, clearToken } from '../../../lib/auth'
import * as authApi from '../api'

export function useLogin() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setToken(data.token)
      navigate('/contacts')
    },
  })
}

export function useSignup() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authApi.signup,
    onSuccess: (data) => {
      setToken(data.token)
      navigate('/contacts')
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
  })
}

export function useResetPassword() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      navigate('/login')
    },
  })
}

export function useAcceptInvite() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authApi.acceptInvite,
    onSuccess: (data) => {
      setToken(data.token)
      navigate('/deals')
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearToken()
      navigate('/login')
    },
  })
}
