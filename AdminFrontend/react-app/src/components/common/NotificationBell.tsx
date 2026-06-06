import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api'
import '../../assets/css/components.css'

const NOTIF_ICONS: Record<string, string> = {
  info: 'fa-info-circle badge-info',
  success: 'fa-check-circle badge-success',
  warning: 'fa-exclamation-triangle badge-warning',
  error: 'fa-exclamation-circle badge-danger',
  default: 'fa-bell badge-info',
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return `${diff} giây trước`
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

interface NotificationItem {
  notificationId?: string | number
  id?: string | number
  title: string
  content?: string
  message?: string
  type?: string
  isRead: boolean
  createdAt?: string
  sentDate?: string
}

export default function NotificationBell({ userRole }: { userRole?: string }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Fetch unread notifications
  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications-unread'],
    queryFn: () => apiClient.get('/notifications/unread').then(r => r.data),
    refetchInterval: 60000, // Refresh every minute
  })

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiClient.put(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    }
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAndView = (notif: NotificationItem) => {
    markAsReadMutation.mutate(notif.notificationId)
  }

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className={`notification-bell-btn${showDropdown ? ' active' : ''}`}
        onClick={() => setShowDropdown((v) => !v)}
        aria-label="Thông báo"
      >
        <i className={`fas fa-bell${showDropdown ? ' fa-shake' : ''}`}></i>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown-wrapper">
          <div className="notification-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="notification-dropdown-header">
              <h4><i className="fas fa-bell"></i> Thông báo</h4>
              <button
                className="close-btn"
                onClick={() => setShowDropdown(false)}
                aria-label="Đóng"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="notification-dropdown-body">
              {loading ? (
                <div className="text-center" style={{ padding: '20px' }}>
                  <i className="fas fa-spinner fa-spin"></i> Đang tải...
                </div>
              ) : notifications.length === 0 ? (
                <div className="empty-notifications">
                  <i className="fas fa-inbox"></i>
                  <p>Không có thông báo mới</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const notifId = notif.notificationId || notif.id
                  const content = notif.content || notif.message || ''
                  return (
                    <div
                      key={String(notifId)}
                      className={`notification-dropdown-item${!notif.isRead ? ' unread' : ''}`}
                      onClick={() => markAndView(notif)}
                    >
                      <div className="notif-icon">
                        <i className={`fas ${NOTIF_ICONS[notif.type ?? 'default']}`}></i>
                      </div>
                      <div className="notif-content">
                        <h5>{notif.title}</h5>
                        <p>{content.slice(0, 60)}{content.length > 60 ? '...' : ''}</p>
                        <span className="notif-time">
                          {timeAgo(notif.createdAt || notif.sentDate)}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {userRole === 'admin' && (
              <div className="notification-dropdown-footer">
                <a href="/admin/notifications">
                  <i className="fas fa-arrow-right"></i> Xem tất cả thông báo
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
