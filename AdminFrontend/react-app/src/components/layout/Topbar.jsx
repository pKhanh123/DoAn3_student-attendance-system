import { useAuth } from '../../contexts/AuthContext'
import NotificationBell from '../common/NotificationBell'
import '../../assets/css/main.css'

const ROLE_DISPLAY = {
  Admin: 'Quản trị viên',
  Lecturer: 'Giảng viên',
  Advisor: 'Cố vấn học tập',
  Student: 'Sinh viên',
}

function getRoleDisplay(role) {
  return ROLE_DISPLAY[role] || role || 'Người dùng'
}

function getInitials(name) {
  if (!name) return 'U'
  return name.charAt(0).toUpperCase()
}

export default function Topbar({ onToggle, collapsed, pageTitle }) {
  const { user, logout } = useAuth()

  const roleLabel = getRoleDisplay(user?.role)
  const initials = getInitials(user?.fullName || user?.userName)

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
          <div className="user-info" role="button" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && window.openAvatarModal?.()}
            onClick={() => window.openAvatarModal?.()}
          >
            <div className="user-avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.fullName || user?.userName || 'User'}</span>
              <span className="user-role">{roleLabel}</span>
            </div>
          </div>

          <button
            onClick={logout}
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
          onKeyDown={(e) => e.key === 'Enter' && window.openAvatarModal?.()}
          onClick={() => window.openAvatarModal?.()}
        >
          <div className="user-avatar">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.fullName || user?.userName || 'User'}</span>
            <span className="user-role">{roleLabel}</span>
          </div>
        </div>
        <button
          onClick={logout}
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
