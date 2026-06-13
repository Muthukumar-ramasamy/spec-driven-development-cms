import axios, { AxiosError } from 'axios'
import { getToken, clearToken } from './auth'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

export function getApiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError && err.response?.data?.message) {
    return err.response.data.message as string
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong.'
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
