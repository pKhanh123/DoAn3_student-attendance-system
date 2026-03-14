import { useCallback } from 'react'

export function useFormatters() {
  const formatDate = useCallback((date: string | Date | null | undefined): string => {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }, [])

  const formatDateTime = useCallback((date: string | Date | null | undefined): string => {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return `${formatDate(d)} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  }, [formatDate])

  const formatDateInput = useCallback((date: string | Date | null | undefined): string => {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  }, [])

  const formatDateTimeInput = useCallback((date: string | Date | null | undefined): string => {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 16)
  }, [])

  const formatPhone = useCallback((phone: string | null | undefined): string => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
    }
    return phone
  }, [])

  const formatCurrency = useCallback((amount: number | null | undefined): string => {
    if (amount == null) return ''
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }, [])

  const formatGPA = useCallback((gpa: number | null | undefined, decimals = 2): string => {
    if (gpa == null) return ''
    return gpa.toFixed(decimals)
  }, [])

  return { formatDate, formatDateTime, formatDateInput, formatDateTimeInput, formatPhone, formatCurrency, formatGPA }
}
