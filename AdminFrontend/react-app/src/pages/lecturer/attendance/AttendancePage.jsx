import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../../../contexts/AuthContext'
import timetableApi from '../../../api/timetableApi'
import attendanceApi from '../../../api/attendanceApi'
import enrollmentApi from '../../../api/enrollmentApi'
import lecturerApi from '../../../api/lecturerApi'

const STATUS_OPTIONS = [
  { value: 'present', label: 'Có mặt', color: '#28a745' },
  { value: 'absent', label: 'Vắng', color: '#dc3545' },
  { value: 'late', label: 'Muộn', color: '#ffc107' },
  { value: 'excused', label: 'Có phép', color: '#17a2b8' },
]

function mapStatus(status) {
  if (!status) return 'present'
  const s = String(status).toUpperCase()
  if (s === 'PRESENT') return 'present'
  if (s === 'ABSENT') return 'absent'
  if (s === 'LATE') return 'late'
  if (s === 'EXCUSED') return 'excused'
  return 'present'
}

function toBackendStatus(frontendStatus) {
  switch (frontendStatus) {
    case 'present': return 'Present'
    case 'absent': return 'Absent'
    case 'late': return 'Late'
    case 'excused': return 'Excused'
    default: return 'Present'
  }
}

function getIsoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

function formatTime(t) {
  if (!t) return ''
  return String(t).substring(0, 5)
}

function getTodayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getBackendWeekday() {
  const day = new Date().getDay()
  return day === 0 ? 1 : day + 1
}

export default function AttendancePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [lecturerId, setLecturerId] = useState(null)
  const [lecturerIdError, setLecturerIdError] = useState(null)
  const [openSessionId, setOpenSessionId] = useState(null) // which session form is open
  const [sessionStudents, setSessionStudents] = useState({}) // sessionId -> student[]
  const [sessionSaved, setSessionSaved] = useState({})       // sessionId -> bool
  const [loadingStudents, setLoadingStudents] = useState({}) // sessionId -> bool

  const today = getTodayString()
  const iso = getIsoWeek(new Date())
  const weekday = getBackendWeekday()

  // Load lecturerId from current user
  useEffect(() => {
    const lid = user?.lecturerId || user?.relatedId
    if (lid) {
      setLecturerId(lid)
      return
    }
    if (!user?.userId) {
      setLecturerIdError('Không tìm thấy thông tin userId')
      return
    }
    lecturerApi.getAll().then(r => {
      const d = r.data
      const list = Array.isArray(d) ? d : (d?.data || d?.items || [])
      const found = list.find(l => l.userId === user.userId || l.user_id === user.userId)
      if (found) setLecturerId(found.lecturerId || found.lecturer_id)
      else setLecturerIdError('Không tìm thấy thông tin giảng viên')
    }).catch(() => setLecturerIdError('Không tìm thấy thông tin giảng viên'))
  }, [user])

  // Fetch today's sessions from timetable
  const { data: rawSchedule = [], isLoading } = useQuery({
    queryKey: ['lecturer-week-schedule', lecturerId, iso.year, iso.week],
    queryFn: () => {
      if (!lecturerId) return Promise.resolve([])
      return timetableApi.getLecturerWeek(lecturerId, iso.year, iso.week).then(r => {
        const d = r.data
        const data = Array.isArray(d) ? d : (d?.data || d?.items || [])
        return data.filter(s => s.weekday === weekday)
          .sort((a, b) => {
            const ta = a.start_time || a.startTime || ''
            const tb = b.start_time || b.startTime || ''
            return ta.localeCompare(tb)
          })
          .map(s => ({
            sessionId: s.session_id || s.sessionId || '',
            classId: s.class_id || s.classId || '',
            subjectName: s.subject_name || s.subjectName || 'N/A',
            className: s.class_name || s.className || 'N/A',
            room: s.room_code || s.roomCode || 'N/A',
            startTime: formatTime(s.start_time || s.startTime || ''),
            endTime: formatTime(s.end_time || s.endTime || ''),
          }))
      })
    },
    enabled: !!lecturerId,
    staleTime: 30 * 1000,
  })

  // Check which sessions already have attendance saved today
  const { data: checkedSessions = [] } = useQuery({
    queryKey: ['checked-sessions', rawSchedule, today],
    queryFn: async () => {
      const results = await Promise.all(rawSchedule.map(async (s) => {
        if (!s.sessionId) return { ...s, attendanceSaved: false }
        try {
          const r = await attendanceApi.getBySchedule(s.sessionId)
          const atts = Array.isArray(r.data) ? r.data : (r.data?.data || [])
          const todayAtts = atts.filter(a => {
            const d = a.attendanceDate || a.attendance_date || a.date
            if (!d) return false
            const ds = new Date(d)
            if (isNaN(ds.getTime())) return false
            const dsStr = `${ds.getFullYear()}-${String(ds.getMonth() + 1).padStart(2, '0')}-${String(ds.getDate()).padStart(2, '0')}`
            return dsStr === today
          })
          return { ...s, attendanceSaved: todayAtts.length > 0 }
        } catch {
          return { ...s, attendanceSaved: false }
        }
      }))
      return results
    },
    enabled: rawSchedule.length > 0,
    staleTime: 0,
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ session, students }) => {
      // Fetch existing attendances to determine create vs update
      const r = await attendanceApi.getBySchedule(session.sessionId)
      const atts = Array.isArray(r.data) ? r.data : (r.data?.data || [])
      const todayAtts = atts.filter(a => {
        const d = a.attendanceDate || a.attendance_date || a.date
        if (!d) return false
        const ds = new Date(d)
        if (isNaN(ds.getTime())) return false
        const dsStr = `${ds.getFullYear()}-${String(ds.getMonth() + 1).padStart(2, '0')}-${String(ds.getDate()).padStart(2, '0')}`
        return dsStr === today
      })
      const attMap = {}
      todayAtts.forEach(a => {
        const sid = a.student_id || a.studentId
        attMap[sid] = a.attendanceId || a.attendance_id
      })

      const now = new Date()
      const offset = -now.getTimezoneOffset()
      const sign = offset >= 0 ? '+' : '-'
      const abs = Math.abs(offset)
      const oh = String(Math.floor(abs / 60)).padStart(2, '0')
      const om = String(abs % 60).padStart(2, '0')
      const offsetStr = `${sign}${oh}:${om}`
      const dtStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}${offsetStr}`

      const promises = students.map(student => {
        const existingId = attMap[student.studentId]
        if (existingId) {
          return attendanceApi.update(existingId, {
            status: toBackendStatus(student.status),
            notes: student.note || null,
          })
        } else {
          return attendanceApi.create({
            studentId: student.studentId,
            scheduleId: session.sessionId,
            attendanceDate: dtStr,
            status: toBackendStatus(student.status),
            notes: student.note || null,
            markedBy: user?.username || user?.userId || 'lecturer',
            createdBy: user?.username || user?.userId || 'lecturer',
          })
        }
      })
      return Promise.all(promises)
    },
    onSuccess: (_, { session }) => {
      toast.success('Lưu điểm danh thành công!')
      setSessionSaved(prev => ({ ...prev, [session.sessionId]: true }))
      setOpenSessionId(null)
      queryClient.invalidateQueries({ queryKey: ['checked-sessions'] })
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Lỗi khi lưu điểm danh'
      toast.error(msg)
    },
  })

  // Load student roster when opening a session
  const openSession = useCallback(async (session) => {
    if (openSessionId === session.sessionId) {
      setOpenSessionId(null)
      return
    }
    if (sessionSaved[session.sessionId]) {
      toast('Lớp học này đã được điểm danh', { icon: 'ℹ️' })
      return
    }
    setOpenSessionId(session.sessionId)
    if (sessionStudents[session.sessionId]) return

    setLoadingStudents(prev => ({ ...prev, [session.sessionId]: true }))

    try {
      const [rosterRes, attRes] = await Promise.all([
        enrollmentApi.getClassRoster(session.classId),
        session.sessionId ? attendanceApi.getBySchedule(session.sessionId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ])

      const roster = Array.isArray(rosterRes.data) ? rosterRes.data
        : (rosterRes.data?.data || rosterRes.data?.items || [])
      const atts = Array.isArray(attRes.data) ? attRes.data
        : (attRes.data?.data || attRes.data?.items || [])
      const todayAtts = atts.filter(a => {
        const d = a.attendanceDate || a.attendance_date || a.date
        if (!d) return false
        const ds = new Date(d)
        if (isNaN(ds.getTime())) return false
        const dsStr = `${ds.getFullYear()}-${String(ds.getMonth() + 1).padStart(2, '0')}-${String(ds.getDate()).padStart(2, '0')}`
        return dsStr === today
      })
      const attMap = {}
      todayAtts.forEach(a => {
        const sid = a.student_id || a.studentId
        attMap[sid] = { status: mapStatus(a.status), note: a.notes || a.note || '' }
      })

      const students = roster.map(enrollment => {
        const student = enrollment.student || {}
        const studentId = student.studentId || enrollment.studentId
        const existing = attMap[studentId]
        return {
          id: studentId,
          studentId,
          studentCode: student.studentCode || enrollment.studentCode || 'N/A',
          fullName: student.fullName || enrollment.fullName || 'N/A',
          status: existing ? existing.status : 'present',
          note: existing ? existing.note : '',
        }
      })

      setSessionStudents(prev => ({ ...prev, [session.sessionId]: students }))
    } catch (err) {
      toast.error('Không thể tải danh sách sinh viên')
      setSessionStudents(prev => ({ ...prev, [session.sessionId]: [] }))
    } finally {
      setLoadingStudents(prev => ({ ...prev, [session.sessionId]: false }))
    }
  }, [openSessionId, sessionStudents, sessionSaved, today])

  function handleStatusChange(sessionId, studentId, status) {
    setSessionStudents(prev => ({
      ...prev,
      [sessionId]: prev[sessionId].map(s =>
        s.studentId === studentId ? { ...s, status } : s
      ),
    }))
  }

  function handleNoteChange(sessionId, studentId, note) {
    setSessionStudents(prev => ({
      ...prev,
      [sessionId]: prev[sessionId].map(s =>
        s.studentId === studentId ? { ...s, note } : s
      ),
    }))
  }

  function markAllPresent(session) {
    setSessionStudents(prev => ({
      ...prev,
      [session.sessionId]: prev[session.sessionId].map(s => ({ ...s, status: 'present' })),
    }))
  }

  function getCount(session, status) {
    const list = sessionStudents[session.sessionId] || []
    return list.filter(s => s.status === status).length
  }

  function handleSave(session) {
    const students = sessionStudents[session.sessionId]
    if (!students || students.length === 0) {
      toast.error('Không có sinh viên để điểm danh')
      return
    }
    if (!window.confirm(`Lưu điểm danh cho ${students.length} sinh viên?`)) return
    saveMutation.mutate({ session, students })
  }

  const todayLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-clipboard-list"></i> Điểm danh</h1>
        <p className="text-muted">{todayLabel}</p>
      </div>

      {lecturerIdError && (
        <div className="alert alert-danger">{lecturerIdError}</div>
      )}

      {isLoading && (
        <div className="text-center py-5"><i className="fas fa-spinner fa-spin fa-2x"></i></div>
      )}

      {!isLoading && !lecturerIdError && checkedSessions.length === 0 && (
        <div className="alert alert-info">Không có buổi học nào hôm nay.</div>
      )}

      <div className="session-list">
        {checkedSessions.map(session => (
          <div key={session.sessionId || session.classId} className="card mb-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div>
                <strong>{session.subjectName}</strong>
                <span className="mx-2">|</span>
                <span>{session.className}</span>
                <span className="mx-2">|</span>
                <span><i className="fas fa-map-marker-alt"></i> {session.room}</span>
                <span className="mx-2">|</span>
                <span>{session.startTime} - {session.endTime}</span>
              </div>
              <div>
                {sessionSaved[session.sessionId] ? (
                  <span className="badge badge-success"><i className="fas fa-check"></i> Đã điểm danh</span>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => openSession(session)}
                    disabled={loadingStudents[session.sessionId]}
                  >
                    {loadingStudents[session.sessionId]
                      ? <><i className="fas fa-spinner fa-spin"></i> Đang tải...</>
                      : <><i className="fas fa-clipboard-check"></i> Điểm danh</>
                    }
                  </button>
                )}
              </div>
            </div>

            {/* Expanded attendance form */}
            {openSessionId === session.sessionId && (
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="status-summary">
                    {STATUS_OPTIONS.map(opt => (
                      <span key={opt.value} className="badge me-2" style={{ background: opt.color, color: '#fff' }}>
                        {opt.label}: {getCount(session, opt.value)}
                      </span>
                    ))}
                  </div>
                  <button className="btn btn-outline-success btn-sm" onClick={() => markAllPresent(session)}>
                    <i className="fas fa-check-circle"></i> Tất cả có mặt
                  </button>
                </div>

                {loadingStudents[session.sessionId] ? (
                  <div className="text-center py-3"><i className="fas fa-spinner fa-spin"></i> Đang tải danh sách...</div>
                ) : (
                  <div className="table-container">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Mã SV</th><th>Họ tên</th><th>Trạng thái</th><th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sessionStudents[session.sessionId] || []).map(student => (
                          <tr key={student.studentId}>
                            <td><strong>{student.studentCode}</strong></td>
                            <td>{student.fullName}</td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                {STATUS_OPTIONS.map(opt => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    className={`btn btn-sm ${student.status === opt.value ? 'active' : ''}`}
                                    style={student.status === opt.value
                                      ? { background: opt.color, color: '#fff', borderColor: opt.color }
                                      : { background: '#f8f9fa' }}
                                    onClick={() => handleStatusChange(session.sessionId, student.studentId, opt.value)}
                                    title={opt.label}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Ghi chú..."
                                value={student.note || ''}
                                onChange={e => handleNoteChange(session.sessionId, student.studentId, e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-3 text-end">
                  <button className="btn btn-secondary btn-sm me-2" onClick={() => setOpenSessionId(null)}>Đóng</button>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleSave(session)}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending
                      ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                      : <><i className="fas fa-save"></i> Lưu điểm danh</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
