import apiClient from './index'
import type {
  AuthLoginResponse,
  AuthRefreshResponse,
  AuthDefaultResponse,
} from '../types/api'

const BASE = '/auth'

const authApi = {
  login: (credentials: { username: string; password: string }) =>
    apiClient.post<AuthLoginResponse>(`${BASE}/login`, credentials),
  logout: () => {
    const storage = localStorage.getItem('rememberMe') ? localStorage : sessionStorage
    const refreshToken = storage.getItem('refreshToken')
    return apiClient.post<AuthDefaultResponse>(`${BASE}/logout`, { refreshToken })
  },
  refreshToken: (refreshToken: string) =>
    apiClient.post<AuthRefreshResponse>(`${BASE}/refresh`, { refreshToken }),
  forgotPassword: (data: { email: string }) =>
    apiClient.post<AuthDefaultResponse>(`${BASE}/forgot-password`, data),
  verifyOTP: (data: { email: string; otp: string }) =>
    apiClient.post<AuthDefaultResponse>(`${BASE}/verify-otp`, data),
  resetPassword: (data: { email: string; otp: string; newPassword: string; confirmPassword: string }) =>
    apiClient.post<AuthDefaultResponse>(`${BASE}/reset-password`, data),
  getOTPRemainingTime: (email: string) =>
    apiClient.get(`${BASE}/otp-remaining-time?email=${encodeURIComponent(email)}`),
}

export default authApi
