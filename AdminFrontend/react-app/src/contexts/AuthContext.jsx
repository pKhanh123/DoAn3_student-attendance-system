import { createContext, useContext, useState, useEffect } from 'react'
import { STORAGE_KEYS } from '../utils/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Khôi phục session từ localStorage/sessionStorage
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      || sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER)
      || sessionStorage.getItem(STORAGE_KEYS.USER)

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
        setIsAuthenticated(true)
      } catch {
        logout()
      }
    }
    setLoading(false)
  }, [])

  const login = (userData, token, refreshToken, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token)
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true')
    }
    setUser(userData)
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME)
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    sessionStorage.removeItem(STORAGE_KEYS.USER)
    setUser(null)
    setIsAuthenticated(false)
  }

  const updateUser = (userData) => {
    const storage = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)
      ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
    setUser(userData)
  }

  if (loading) {
    return <div className="loading-screen">Đang tải...</div>
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, updateUser }}>
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
