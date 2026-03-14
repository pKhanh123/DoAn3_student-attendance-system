import { useAuthStore } from '../stores/authStore'
import type { UserRole } from '../types'

interface AuthUser {
  userId: string | number
  username: string
  email: string
  fullName: string
  role: UserRole
  avatarUrl?: string
}

interface LoginPayload {
  userData: AuthUser
  token: string
  refreshToken: string
  rememberMe?: boolean
}

export function useAuth() {
  const { user, token, isAuthenticated, login, logout, updateUser, setToken } = useAuthStore()

  const loginUser = (payload: LoginPayload) => {
    login(payload.userData, payload.token, payload.refreshToken, payload.rememberMe)
  }

  return {
    user,
    token,
    isAuthenticated,
    login: loginUser,
    logout,
    updateUser,
    setToken,
  }
}
