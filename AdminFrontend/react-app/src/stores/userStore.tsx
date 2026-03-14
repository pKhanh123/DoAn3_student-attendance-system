import { create } from 'zustand'
import type { UserRole } from '../types'

interface UserProfile {
  userId: string | number
  username: string
  email: string
  fullName: string
  phone?: string
  role: UserRole
  avatarUrl?: string
}

interface UserState {
  profile: UserProfile | null
  setProfile: (profile: UserProfile) => void
  clearProfile: () => void
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
}))
