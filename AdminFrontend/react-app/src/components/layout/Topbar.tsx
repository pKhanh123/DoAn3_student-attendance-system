import NotificationBell from '../common/NotificationBell'
import { useAuth } from '../../contexts/AuthContext'
import '../../assets/css/main.css'

const ROLE_DISPLAY: Record<string, string> = {
  Admin: 'Quản trị viên',
  Lecturer: 'Giảng viên',
  Advisor: 'Cố vấn học tập',
  Student: 'Sinh viên',
}

export default function Topbar({
  onToggle,
  collapsed,
  pageTitle,
}: {
  onToggle?: () => void
  collapsed?: boolean
  pageTitle?: string
}) {
  // Lấy user từ AuthContext
  let auth: ReturnType<typeof useAuth> | null = null
  let user: { fullName?: string; username?: string; role?: string; avatarUrl?: string } | null = null
  try {
    auth = useAuth()
    user = auth?.user ?? null
  } catch {
    user = null
  }

  const roleLabel = ROLE_DISPLAY[user?.role ?? ''] ?? user?.role ?? 'Người dùng'
  const initials = (user?.fullName || user?.username || 'U').charAt(0).toUpperCase()

  return (
    <header className="header">
      <div className="header-top-row">
        <div className="header-left">
          <button
            className="menu-toggle"
            onClick={onToggle}
            aria-label="Toggle menu"
          >
            <i className={`fas fa${collapsed ? '-expand' : '-collapse'}`}></i>
          </button>
          <h1 className="page-title">{pageTitle}</h1>
        </div>

        <div className="header-notifications">
          <NotificationBell userRole={user?.role} />
        </div>

        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.fullName || user?.username || 'User'}</span>
              <span className="user-role">{roleLabel}</span>
            </div>
          </div>

          <button
            onClick={() => auth?.logout()}
            className="btn btn-outline btn-logout"
            aria-label="Đăng xuất"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span className="logout-text">Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Mobile row */}
      <div className="header-bottom-row">
        <div className="user-info" role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && (window as unknown as { openAvatarModal?: () => void }).openAvatarModal?.()}
          onClick={() => (window as unknown as { openAvatarModal?: () => void }).openAvatarModal?.()}
        >
          <div className="user-avatar">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.fullName || user?.username || 'User'}</span>
            <span className="user-role">{roleLabel}</span>
          </div>
        </div>
        <button
          onClick={() => auth?.logout()}
          className="btn btn-outline btn-logout-mobile"
          aria-label="Đăng xuất"
        >
          <i className="fas fa-sign-out-alt"></i>
          <span className="logout-text">Đăng xuất</span>
        </button>
      </div>
    </header>
  )
}
