import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import apiClient from '../../api'
import '../../assets/css/dashboard.css'

// ============================================================
// LOCAL TYPES
// ============================================================

interface AdvisorDashboardStats {
  totalStudents: number
  warningAttendanceStudents: number
  lowGpaStudents: number
  excellentStudents: number
  pendingEnrollments: number
}

type WarningStudent = {
  studentId?: number
  id?: number
  studentCode: string
  fullName: string
  className?: string
  gpa?: number
  attendanceRate?: number
  warningType?: 'attendance' | 'academic' | 'both'
}

// ============================================================
// STATELESS HELPERS
// ============================================================

const GPA_COLOR = (gpa?: number): string => {
  if (!gpa) return 'badge-secondary'
  if (gpa >= 3.0) return 'badge-success'
  if (gpa >= 2.0) return 'badge-warning'
  return 'badge-danger'
}

const ATTENDANCE_COLOR = (rate?: number): string => {
  if (rate === undefined || rate === null) return 'badge-secondary'
  if (rate >= 80) return 'badge-success'
  if (rate >= 60) return 'badge-warning'
  return 'badge-danger'
}

const getAbsenceRate = (student: WarningStudent): string | null =>
  student.attendanceRate != null ? (100 - student.attendanceRate).toFixed(1) : null

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface StatCardProps {
  icon: string
  color: string
  value?: number | null
  label: string
  onClick?: () => void
  badge?: string | null
}

const StatCard: React.FC<StatCardProps> = ({ icon, color, value, label, onClick, badge }) => (
  <div
    className={`stat-card${onClick ? ' clickable' : ''}`}
    onClick={onClick}
  >
    <div className={`stat-icon ${color}`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div className="stat-info">
      <h3>
        {value ?? <i className="fas fa-spinner fa-spin"></i>}
        {badge && <span className="badge badge-danger" style={{ marginLeft: 8 }}>{badge}</span>}
      </h3>
      <p>{label}</p>
    </div>
  </div>
)

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AdvisorDashboardPage(): React.JSX.Element {
  const navigate = useNavigate()

  const statsResult: UseQueryResult<AdvisorDashboardStats> = useQuery<AdvisorDashboardStats>({
    queryKey: ['advisor-dashboard-stats'],
    queryFn: () => apiClient.get<AdvisorDashboardStats>('/advisor/dashboard/stats').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })
  const stats = statsResult.data

  const warningResult: UseQueryResult<WarningStudent[]> = useQuery<WarningStudent[]>({
    queryKey: ['advisor-warning-students'],
    queryFn: () => apiClient.get<WarningStudent[]>('/advisor/dashboard/warning-students').then((r) => r.data),
    staleTime: 30 * 1000,
  })
  const { data: warningStudents, isLoading: loadingWarning, refetch: refetchWarning } = warningResult

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          icon="fa-users"
          color="blue"
          value={stats?.totalStudents}
          label="Tổng sinh viên toàn trường"
        />
        <StatCard
          icon="fa-exclamation-triangle"
          color="red"
          value={stats?.warningAttendanceStudents}
          label="Cảnh báo chuyên cần (>20%)"
        />
        <StatCard
          icon="fa-chart-line"
          color="orange"
          value={stats?.lowGpaStudents}
          label="Điểm TB < 2.0"
        />
        <StatCard
          icon="fa-star"
          color="green"
          value={stats?.excellentStudents}
          label="Sinh viên giỏi (GPA >= 3.5)"
        />
        <StatCard
          icon="fa-clipboard-check"
          color="purple"
          value={stats?.pendingEnrollments}
          label="Đăng ký chờ duyệt"
          badge={stats?.pendingEnrollments && stats.pendingEnrollments > 10 ? 'Cần xử lý' : null}
          onClick={() => navigate('/advisor/enrollment-approval')}
        />
      </div>

      {/* Warning Students */}
      <div className="card">
        <div className="card-header">
          <h2><i className="fas fa-exclamation-triangle"></i> Sinh viên cần quan tâm</h2>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => refetchWarning()}
            disabled={loadingWarning}
          >
            <i className="fas fa-sync-alt"></i> Làm mới
          </button>
        </div>
        <div className="card-body">
          {loadingWarning ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <p>Đang tải danh sách sinh viên...</p>
            </div>
          ) : !warningStudents || !warningStudents.length ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <i className="fas fa-check-circle fa-3x" style={{ color: '#10b981' }}></i>
              <p>Không có sinh viên nào cần cảnh báo</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>MSSV</th>
                    <th>Họ và tên</th>
                    <th>Lớp</th>
                    <th>GPA</th>
                    <th>Chuyên cần (%)</th>
                    <th>Cảnh báo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {warningStudents.map((student) => {
                    const studentId = student.studentId ?? student.id
                    return (
                      <tr key={studentId}>
                        <td>{student.studentCode}</td>
                        <td><strong>{student.fullName}</strong></td>
                        <td>{student.className || 'N/A'}</td>
                        <td>
                          <span className={`badge ${GPA_COLOR(student.gpa)}`}>
                            {student.gpa ? student.gpa.toFixed(2) : 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${ATTENDANCE_COLOR(student.attendanceRate)}`}>
                            {student.attendanceRate != null
                              ? `${student.attendanceRate.toFixed(1)}%`
                              : 'N/A'}
                          </span>
                        </td>
                        <td>
                          {student.warningType === 'attendance' && (
                            <span className="badge badge-danger">
                              <i className="fas fa-user-times"></i> Chuyên cần
                            </span>
                          )}
                          {student.warningType === 'academic' && (
                            <span className="badge badge-warning">
                              <i className="fas fa-chart-line"></i> Học tập
                            </span>
                          )}
                          {student.warningType === 'both' && (
                            <span className="badge badge-danger">
                              <i className="fas fa-exclamation-circle"></i> Cả hai
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => navigate(`/advisor/students/${studentId}`)}
                            title="Xem chi tiết"
                          >
                            <i className="fas fa-eye"></i> Chi tiết
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
    </div>
  )
}
