import { create } from 'zustand'

interface AppState {
  sidebarCollapsed: boolean
  isMobile: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setIsMobile: (mobile: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  isMobile: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setIsMobile: (mobile) => set({ isMobile: mobile }),
}))
