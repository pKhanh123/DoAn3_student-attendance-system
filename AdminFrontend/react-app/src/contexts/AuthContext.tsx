import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
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

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  loading: boolean
  login: (userData: AuthUser, token: string, refreshToken: string, rememberMe?: boolean) => void
  logout: () => void
  updateUser: (userData: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      || sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER)
      || sessionStorage.getItem(STORAGE_KEYS.USER)

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser) as AuthUser)
      } catch {
        logout()
      }
    }
    setLoading(false)
  }, [])

  const login = (userData: AuthUser, token: string, refreshToken: string, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token)
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true')
    }
    setUser(userData)
  }

  const _doLogout = () => {
    ;[STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER, STORAGE_KEYS.REMEMBER_ME].forEach(
      (k) => {
        localStorage.removeItem(k)
        sessionStorage.removeItem(k)
      }
    )
    setUser(null)
    window.location.href = '/auth/login'
  }

  const logout = () => {
    import('../api/authApi').then(({ default: authApi }) => {
      authApi.logout().catch(() => {}).finally(() => _doLogout())
    })
  }

  const updateUser = (userData: AuthUser) => {
    const storage = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true'
      ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
    setUser(userData)
  }

  if (loading) {
    return <div className="loading-screen">Đang tải...</div>
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
