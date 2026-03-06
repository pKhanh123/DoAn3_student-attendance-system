import { useState, useEffect, useRef } from 'react'
import '../../assets/css/components.css'

const NOTIF_ICONS = {
  info: 'fa-info-circle badge-info',
  success: 'fa-check-circle badge-success',
  warning: 'fa-exclamation-triangle badge-warning',
  error: 'fa-exclamation-circle badge-danger',
  default: 'fa-bell badge-info',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return `${diff} giây trước`
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

function getNotifIcon(type) {
  return NOTIF_ICONS[type] || NOTIF_ICONS.default
}

export default function NotificationBell({ userRole }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAndView = (notif) => {
    setNotifications((prev) =>
      prev.map((n) => (n.notificationId === notif.notificationId ? { ...n, isRead: true } : n))
    )
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
                notifications.map((notif) => (
                  <div
                    key={notif.notificationId || notif.id}
                    className={`notification-dropdown-item${!notif.isRead ? ' unread' : ''}`}
                    onClick={() => markAndView(notif)}
                  >
                    <div className="notif-icon">
                      <i className={`fas ${getNotifIcon(notif.type)}`}></i>
                    </div>
                    <div className="notif-content">
                      <h5>{notif.title}</h5>
                      <p>
                        {(notif.content || notif.message || '').slice(0, 60)}
                        {(notif.content || notif.message || '').length > 60 ? '...' : ''}
                      </p>
                      <span className="notif-time">
                        {timeAgo(notif.createdAt || notif.sentDate)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="notification-dropdown-footer">
              <a href={`/${(userRole || '').toLowerCase()}/notifications`}>
                <i className="fas fa-arrow-right"></i> Xem tất cả thông báo
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
