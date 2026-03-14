import { create } from 'zustand'
import { api } from '../api'
import { STORAGE_KEYS } from '../utils/constants'
import type { UserRole } from '../types'

interface AuthUser {
  userId: string | number
  username: string
  email: string
  fullName: string
  role: UserRole
  avatarUrl?: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (userData: AuthUser, token: string, refreshToken: string, rememberMe?: boolean) => void
  logout: () => void
  updateUser: (userData: AuthUser) => void
  setToken: (token: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER) || sessionStorage.getItem(STORAGE_KEYS.USER)
      return savedUser ? (JSON.parse(savedUser) as AuthUser) : null
    } catch {
      return null
    }
  })(),

  token: (() => {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      || sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      || null
  })(),

  isAuthenticated: !!(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    || sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)),

  login: (userData, token, refreshToken, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token)
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true')
    }
    set({ user: userData, token, isAuthenticated: true })
  },

  logout: () => {
    ;[STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER, STORAGE_KEYS.REMEMBER_ME].forEach(
      (k) => {
        localStorage.removeItem(k)
        sessionStorage.removeItem(k)
      }
    )
    api.post('/auth/logout').catch(() => {})
    set({ user: null, token: null, isAuthenticated: false })
    window.location.href = '/auth/login'
  },

  updateUser: (userData) => {
    const isRemember = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true'
    const storage = isRemember ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
    set({ user: userData })
  },

  setToken: (token) => {
    const isRemember = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true'
    const storage = isRemember ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token)
    set({ token })
  },
}))
