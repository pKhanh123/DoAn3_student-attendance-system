import { create } from 'zustand'

interface QueryState {
  cacheVersion: number
  invalidateAll: () => void
}

export const useQueryStore = create<QueryState>((set) => ({
  cacheVersion: 0,
  invalidateAll: () => set((state) => ({ cacheVersion: state.cacheVersion + 1 })),
}))
