import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = `${title} | Hệ thống Quản lý Đào tạo`
    return () => {
      document.title = prev
    }
  }, [title])
}
