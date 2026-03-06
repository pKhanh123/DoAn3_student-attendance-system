import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api'
import '../../assets/css/dashboard.css'

const SCHEDULE_STATUS = {
  completed: { label: 'Đã kết thúc', class: 'badge-success' },
  in_progress: { label: 'Đang diễn ra', class: 'badge-warning' },
  pending: { label: 'Sắp diễn ra', class: 'badge-secondary' },
}

function getGPAClass(gpa) {
  if (gpa >= 3.0) return 'text-success'
  if (gpa >= 2.0) return 'text-warning'
  return 'text-danger'
}

function getAttendanceClass(rate) {
  if (rate >= 90) return 'text-success'
  if (rate >= 80) return 'text-warning'
  return 'text-danger'
}

export default function StudentDashboardPage() {
  const navigate = useNavigate()

  const { data: studentInfo, isLoading: loadingInfo } = useQuery({
    queryKey: ['student-info'],
    queryFn: () => apiClient.get('/dashboard/student/info').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: todaySchedule, isLoading: loadingToday } = useQuery({
    queryKey: ['student-today-schedule'],
    queryFn: () => apiClient.get('/dashboard/student/today-schedule').then((r) => r.data),
    staleTime: 30 * 1000,
  })

  const { data: upcomingSchedule, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['student-upcoming-schedule'],
    queryFn: () => apiClient.get('/dashboard/student/upcoming-schedule').then((r) => r.data),
    staleTime: 60 * 1000,
  })

  const loading = loadingInfo || loadingToday

  return (
    <div>
      {/* Student Info Card */}
      <div className="card">
        <div className="card-body">
          <div className="student-profile">
            <div className="student-avatar-large">
              {studentInfo?.fullName?.charAt(0) || '?'}
            </div>
            <div className="student-info-details">
              <h2>{studentInfo?.fullName || '...'}</h2>
              <div className="info-grid">
                <div><strong>MSSV:</strong> {studentInfo?.studentCode || '—'}</div>
                <div><strong>Lớp:</strong> {studentInfo?.className || '—'}</div>
                <div><strong>Khoa:</strong> {studentInfo?.faculty || '—'}</div>
                <div><strong>Niên khóa:</strong> {studentInfo?.academicYear || '—'}</div>
              </div>
            </div>
            <div className="student-stats">
              <div className="stat-box">
                <div className={`stat-value ${studentInfo?.gpa != null ? getGPAClass(studentInfo.gpa) : ''}`}>
                  {loadingInfo ? <i className="fas fa-spinner fa-spin"></i> : (studentInfo?.gpa?.toFixed(2) ?? '—')}
                </div>
                <div className="stat-label">GPA</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{studentInfo?.credits ?? '—'}</div>
                <div className="stat-label">Tín chỉ tích lũy</div>
              </div>
              <div className="stat-box">
                <div className={`stat-value ${studentInfo?.attendanceRate != null ? getAttendanceClass(studentInfo.attendanceRate) : ''}`}>
                  {loadingInfo ? <i className="fas fa-spinner fa-spin"></i> : `${studentInfo?.attendanceRate ?? '—'}%`}
                </div>
                <div className="stat-label">Chuyên cần</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="card">
        <div className="card-header">
          <h2><i className="fas fa-calendar-day"></i> Lịch học hôm nay</h2>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <p>Đang tải lịch học...</p>
            </div>
          ) : !todaySchedule?.length ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <i className="fas fa-calendar-times fa-3x" style={{ color: '#94a3b8' }}></i>
              <p>Không có lịch học hôm nay</p>
            </div>
          ) : (
            <div className="schedule-list">
              {todaySchedule.map((schedule) => {
                const statusCfg = SCHEDULE_STATUS[schedule.status] || SCHEDULE_STATUS.pending
                return (
                  <div key={schedule.id} className="schedule-item">
                    <div className="schedule-time">
                      <div className="time-period">
                        Tiết {schedule.period || '?'}
                      </div>
                      <div className="time-range">
                        {schedule.startTime} - {schedule.endTime}
                      </div>
                    </div>
                    <div className="schedule-details">
                      <h3>{schedule.subjectName}</h3>
                      <div className="schedule-meta">
                        <span><i className="fas fa-chalkboard-teacher"></i> {schedule.lecturerName}</span>
                        <span><i className="fas fa-door-open"></i> Phòng {schedule.room}</span>
                      </div>
                    </div>
                    <div className="schedule-status">
                      <span className={`badge ${statusCfg.class}`}>{statusCfg.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Schedule Notifications */}
      {upcomingSchedule?.length > 0 && (
        <div className="card">
          <div className="card-header" style={{ background: '#17a2b8', color: 'white' }}>
            <h2><i className="fas fa-bell"></i> Thông báo lịch học sắp tới</h2>
          </div>
          <div className="card-body">
            {upcomingSchedule.map((day) => (
              <div key={day.dayName} className="upcoming-day-section" style={{ marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid #e9ecef' }}>
                <h4 style={{ color: '#007bff', marginBottom: 10 }}>
                  <i className="fas fa-calendar-check"></i> {day.dayName}
                </h4>
                <div className="schedule-list">
                  {day.sessions.map((session) => (
                    <div key={session.id} className="schedule-item" style={{ background: '#f8f9fa', borderLeft: '3px solid #007bff' }}>
                      <div className="schedule-time">
                        <div className="time-period">Tiết {session.period || '?'}</div>
                        <div className="time-range">{session.startTime} - {session.endTime}</div>
                      </div>
                      <div className="schedule-details">
                        <h3 style={{ margin: 0, fontSize: 16 }}>{session.subjectName}</h3>
                        <div className="schedule-meta" style={{ fontSize: 13, color: '#6c757d' }}>
                          <span><i className="fas fa-chalkboard-teacher"></i> {session.lecturerName}</span>
                          <span style={{ marginLeft: 15 }}><i className="fas fa-door-open"></i> Phòng {session.room}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2><i className="fas fa-bolt"></i> Thao tác nhanh</h2>
        </div>
        <div className="card-body">
          <div className="quick-actions">
            {[
              { to: '/student/timetable', icon: 'fa-calendar-alt', label: 'Thời khóa biểu' },
              { to: '/student/grades', icon: 'fa-chart-line', label: 'Bảng điểm' },
              { to: '/student/attendance', icon: 'fa-clipboard-check', label: 'Điểm danh' },
              { to: '/student/course-register', icon: 'fa-edit', label: 'Đăng ký học phần' },
              { to: '/student/profile', icon: 'fa-user', label: 'Thông tin cá nhân' },
            ].map(({ to, icon, label }) => (
              <button
                key={to}
                className="quick-action-btn"
                onClick={() => navigate(to)}
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
