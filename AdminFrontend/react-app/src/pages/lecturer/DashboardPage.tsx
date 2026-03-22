import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api'
import '../../assets/css/dashboard.css'

// ============================================================
// LOCAL TYPES
// ============================================================

type ScheduleStatus =
  | 'completed'
  | 'in_progress'
  | 'in_progress_not_attended'
  | 'not_completed'
  | 'pending'

interface ScheduleStatusConfig {
  label: string
  class: string
}

interface LecturerDashboardStats {
  totalClasses: number
  totalStudents: number
  todayClasses: number
  warningStudents: number
}

interface TodaySession {
  id: number
  classId: number
  period: number
  subjectName: string
  className: string
  room: string
  startTime: string
  endTime: string
  status: ScheduleStatus
}

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_MAP: Record<ScheduleStatus, ScheduleStatusConfig> = {
  completed: { label: 'Đã hoàn thành', class: 'badge-success' },
  in_progress: { label: 'Đang diễn ra', class: 'badge-warning' },
  in_progress_not_attended: {
    label: 'Đang diễn ra (chưa điểm danh)',
    class: 'badge-warning',
  },
  not_completed: { label: 'Chưa hoàn thành', class: 'badge-danger' },
  pending: { label: 'Chưa bắt đầu', class: 'badge-secondary' },
}

// ============================================================
// COMPONENTS
// ============================================================

interface StatCardProps {
  icon: string
  color: string
  value: number | string | null | undefined
  label: string
  onClick?: () => void
}

function StatCard({ icon, color, value, label, onClick }: StatCardProps): React.JSX.Element {
  return (
    <div className={`stat-card${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <div className={`stat-icon ${color}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div className="stat-info">
        <h3>{value ?? <i className="fas fa-spinner fa-spin"></i>}</h3>
        <p>{label}</p>
      </div>
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function LecturerDashboardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [reminderDismissed, setReminderDismissed] = useState<boolean>(false)

  const { data: rawStats, isLoading: loadingStats } = useQuery({
    queryKey: ['lecturer-dashboard-stats'],
    queryFn: () =>
      apiClient.get<LecturerDashboardStats>('/dashboard/lecturer/stats').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  // API may return { data: [...] } or a flat array — normalise to array
  const { data: rawSchedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ['lecturer-today-schedule'],
    queryFn: () =>
      apiClient.get<TodaySession[]>('/dashboard/lecturer/today-schedule').then((r) => r.data),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })

  const todaySchedule: TodaySession[] = Array.isArray(rawSchedule)
    ? rawSchedule
    : Array.isArray(rawSchedule?.data)
      ? (rawSchedule as { data: TodaySession[] }).data
      : []

  const unattendCount: number =
    todaySchedule.filter(
      (s) => s.status === 'in_progress_not_attended' || s.status === 'pending'
    ).length ?? 0

  const showReminder: boolean = !reminderDismissed && unattendCount > 0

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          icon="fa-book-open"
          color="blue"
          value={rawStats?.totalClasses}
          label="Lớp đang giảng dạy"
          onClick={undefined}
        />
        <StatCard
          icon="fa-user-graduate"
          color="green"
          value={rawStats?.totalStudents}
          label="Tổng số sinh viên"
          onClick={undefined}
        />
        <StatCard
          icon="fa-calendar-check"
          color="orange"
          value={rawStats?.todayClasses}
          label="Tiết học hôm nay"
          onClick={undefined}
        />
        <StatCard
          icon="fa-exclamation-triangle"
          color="purple"
          value={rawStats?.warningStudents}
          label="SV cảnh báo chuyên cần"
          onClick={undefined}
        />
      </div>

      {/* Attendance Reminder */}
      {showReminder && (
        <div
          className="alert alert-warning alert-dismissible fade show attendance-reminder"
          role="alert"
        >
          <i className="fas fa-exclamation-triangle"></i>
          <strong>Nhắc nhở:</strong> Bạn còn <strong>{unattendCount}</strong> tiết học chưa
          điểm danh hôm nay. Vui lòng hoàn tất điểm danh trước khi kết thúc ngày.
          <button
            type="button"
            className="close-btn"
            onClick={(): void => setReminderDismissed(true)}
            aria-label="Đóng"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Today's Schedule */}
      <div className="card">
        <div className="card-header">
          <h2>
            <i className="fas fa-calendar-day"></i> Lịch giảng dạy hôm nay
          </h2>
        </div>
        <div className="card-body">
          {loadingSchedule ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <p>Đang tải...</p>
            </div>
          ) : !todaySchedule.length ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <i className="fas fa-calendar-times fa-3x" style={{ color: '#94a3b8' }}></i>
              <p>Không có lịch giảng dạy hôm nay</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tiết</th>
                    <th>Môn học</th>
                    <th>Lớp</th>
                    <th>Phòng</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySchedule.map((schedule) => {
                    const statusCfg: ScheduleStatusConfig =
                      STATUS_MAP[schedule.status] || STATUS_MAP['pending']
                    const attUrl: string = `/lecturer/attendance?sessionId=${schedule.id}&classId=${schedule.classId}&period=${schedule.period}`
                    return (
                      <tr key={schedule.id}>
                        <td>{schedule.period}</td>
                        <td>
                          <strong>{schedule.subjectName}</strong>
                        </td>
                        <td>{schedule.className}</td>
                        <td>{schedule.room}</td>
                        <td>
                          {schedule.startTime} - {schedule.endTime}
                        </td>
                        <td>
                          <span className={`badge ${statusCfg.class}`}>{statusCfg.label}</span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={(): void => navigate(attUrl)}
                          >
                            <i className="fas fa-clipboard-check"></i> Điểm danh
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2>
            <i className="fas fa-bolt"></i> Thao tác nhanh
          </h2>
        </div>
        <div className="card-body">
          <div className="quick-actions">
            {[
              {
                to: '/lecturer/attendance',
                icon: 'fa-clipboard-check',
                label: 'Điểm danh lớp học',
              },
              { to: '/lecturer/grades', icon: 'fa-edit', label: 'Nhập điểm' },
              {
                to: '/lecturer/timetable',
                icon: 'fa-calendar-alt',
                label: 'Xem lịch giảng dạy',
              },
              { to: '/lecturer/reports', icon: 'fa-chart-bar', label: 'Báo cáo lớp học' },
            ].map(({ to, icon, label }) => (
              <button
                key={to}
                className="quick-action-btn"
                onClick={(): void => navigate(to)}
              >
                <i className={`fas ${icon}`}></i>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
