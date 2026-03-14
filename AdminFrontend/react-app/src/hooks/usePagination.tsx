import { useState, useCallback } from 'react'

interface UsePaginationReturn {
  page: number
  pageSize: number
  total: number
  totalPages: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setTotal: (total: number) => void
  resetPage: () => void
}

export function usePagination(
  defaultPage = 1,
  defaultPageSize = 20
): UsePaginationReturn {
  const [page, setPageState] = useState(defaultPage)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)
  const [total, setTotalState] = useState(0)

  const totalPages = Math.ceil(total / pageSize)

  const setPage = useCallback((p: number) => {
    setPageState(Math.max(1, p))
  }, [])

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size)
    setPageState(1)
  }, [])

  const setTotal = useCallback((t: number) => {
    setTotalState(t)
  }, [])

  const resetPage = useCallback(() => {
    setPageState(1)
  }, [])

  return {
    page,
    pageSize,
    total,
    totalPages,
    setPage,
    setPageSize,
    setTotal,
    resetPage,
  }
}
