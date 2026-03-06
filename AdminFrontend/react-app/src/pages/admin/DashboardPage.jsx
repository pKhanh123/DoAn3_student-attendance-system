import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import apiClient from '../../api'
import '../../assets/css/dashboard.css'

const STAT_ICONS = {
  totalUsers: { icon: 'fa-users', color: 'blue', label: 'Tổng người dùng' },
  totalStudents: { icon: 'fa-user-graduate', color: 'green', label: 'Sinh viên' },
  totalLecturers: { icon: 'fa-chalkboard-teacher', color: 'orange', label: 'Giảng viên' },
  totalFaculties: { icon: 'fa-building', color: 'purple', label: 'Khoa' },
  totalMajors: { icon: 'fa-code-branch', color: 'teal', label: 'Ngành học' },
  totalSubjects: { icon: 'fa-book', color: 'red', label: 'Môn học' },
  totalAcademicYears: { icon: 'fa-calendar-alt', color: 'indigo', label: 'Niên khóa' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff} giây trước`
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}

const ACTION_ICONS = { CREATE: 'fa-plus', UPDATE: 'fa-edit', DELETE: 'fa-trash' }

export default function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => apiClient.get('/dashboard/admin/stats').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: auditLogs, isLoading: loadingAudit } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => apiClient.get('/audit-logs/recent?pageSize=10').then((r) => r.data),
    staleTime: 30 * 1000,
  })

  return (
    <div>
      {/* Error */}
      {stats?.error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle"></i> {stats.error}
        </div>
      )}

      {/* Stats Row 1 */}
      <div className="stats-grid">
        {[
          { key: 'totalUsers', value: stats?.totalUsers },
          { key: 'totalStudents', value: stats?.totalStudents },
          { key: 'totalLecturers', value: stats?.totalLecturers },
          { key: 'totalFaculties', value: stats?.totalFaculties },
        ].map(({ key, value }) => {
          const cfg = STAT_ICONS[key]
          return (
            <div key={key} className="stat-card">
              <div className={`stat-icon ${cfg.color}`}>
                <i className={`fas ${cfg.icon}`}></i>
              </div>
              <div className="stat-details">
                <div className="stat-label">{cfg.label}</div>
                <div className="stat-value">
                  {loadingStats ? <i className="fas fa-spinner fa-spin"></i> : (value || 0)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats Row 2 */}
      <div className="stats-grid">
        {[
          { key: 'totalMajors', value: stats?.totalMajors },
          { key: 'totalSubjects', value: stats?.totalSubjects },
          { key: 'totalAcademicYears', value: stats?.totalAcademicYears },
          {
            key: 'totalData',
            value: [
              stats?.totalUsers, stats?.totalStudents, stats?.totalLecturers,
              stats?.totalFaculties, stats?.totalMajors, stats?.totalSubjects,
            ].reduce((a, b) => a + (b || 0), 0),
            icon: 'fa-chart-line',
            color: 'gray',
            label: 'Tổng dữ liệu',
          },
        ].map(({ key, value, icon, color, label }) => {
          const cfg = STAT_ICONS[key] || {}
          return (
            <div key={key} className="stat-card">
              <div className={`stat-icon ${cfg.color || color}`}>
                <i className={`fas ${cfg.icon || icon}`}></i>
              </div>
              <div className="stat-details">
                <div className="stat-label">{cfg.label || label}</div>
                <div className="stat-value">
                  {loadingStats ? <i className="fas fa-spinner fa-spin"></i> : (value || 0)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Thao tác nhanh</h3>
        </div>
        <div className="card-body">
          <div className="quick-actions">
            {[
              { to: '/admin/users/new', icon: 'fa-user-plus', label: 'Thêm người dùng' },
              { to: '/admin/students/new', icon: 'fa-user-graduate', label: 'Thêm sinh viên' },
              { to: '/admin/lecturers', icon: 'fa-chalkboard-teacher', label: 'Thêm giảng viên' },
              { to: '/admin/roles', icon: 'fa-user-shield', label: 'Vai trò' },
              { to: '/admin/organization', icon: 'fa-building', label: 'Tổ chức' },
              { to: '/admin/audit-logs', icon: 'fa-history', label: 'Nhật ký' },
            ].map(({ to, icon, label }) => (
              <Link key={to} to={to} className="quick-action-btn">
                <i className={`fas ${icon}`}></i>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Hoạt động gần đây (Audit Log)</h3>
        </div>
        <div className="card-body">
          {loadingAudit ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <p>Đang tải...</p>
            </div>
          ) : !auditLogs?.length ? (
            <div className="text-muted text-center">Không có log gần đây.</div>
          ) : (
            <ul className="activity-list">
              {auditLogs.map((log) => (
                <li key={log.id || log.auditId} className="activity-item">
                  <div className="activity-icon">
                    <i className={`fas ${ACTION_ICONS[log.action] || 'fa-info-circle'}`}></i>
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">
                      {log.entityType} — {log.description || log.action}
                    </div>
                    <div className="activity-time">{timeAgo(log.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
