import { create } from 'zustand'

interface SidebarState {
  collapsed: boolean
  isMobileOpen: boolean
  toggle: () => void
  setCollapsed: (collapsed: boolean) => void
  setMobileOpen: (open: boolean) => void
  closeMobile: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  isMobileOpen: false,
  toggle: () => set((state) => ({ collapsed: !state.collapsed })),
  setCollapsed: (collapsed) => set({ collapsed }),
  setMobileOpen: (open) => set({ isMobileOpen: open }),
  closeMobile: () => set({ isMobileOpen: false }),
}))
