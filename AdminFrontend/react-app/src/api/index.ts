import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios'
import { STORAGE_KEYS } from '../utils/constants'

const apiClient: AxiosInstance = axios.create({
  baseURL: '/api-edu',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ||
      sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      originalRequest._retry = true
      try {
        const refreshToken =
          localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ||
          sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
        if (!refreshToken) {
          window.location.href = '/auth/login'
          throw error
        }
        const res = await axios.post('/auth/refresh', { refreshToken })
        const { Token: newToken, RefreshToken: newRefresh } = res.data as {
          Token: string
          RefreshToken: string
        }
        const storage = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)
          ? localStorage
          : sessionStorage
        storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken)
        storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefresh)
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return apiClient(originalRequest)
      } catch {
        ;[STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER, STORAGE_KEYS.REMEMBER_ME].forEach(
          (k) => {
            localStorage.removeItem(k)
            sessionStorage.removeItem(k)
          }
        )
        window.location.href = '/auth/login'
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
