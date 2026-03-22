import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../../../contexts/AuthContext'
import timetableApi from '../../../api/timetableApi'
import attendanceApi from '../../../api/attendanceApi'
import enrollmentApi from '../../../api/enrollmentApi'
import lecturerApi from '../../../api/lecturerApi'
import type { Lecturer, AttendanceStatus } from '../../../types'

// ============================================================
// LOCAL TYPES
// ============================================================

interface StatusOption {
  value: AttendanceStatus
  label: string
  color: string
}

interface SessionStudent {
  id: number
  studentId: number
  studentCode: string
  fullName: string
  status: AttendanceStatus
  note: string
}

interface Session {
  sessionId: number | string
  classId: number | string
  subjectName: string
  className: string
  room: string
  startTime: string
  endTime: string
}

interface SavePayload {
  session: Session
  students: SessionStudent[]
}

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'present', label: 'Có mặt', color: '#28a745' },
  { value: 'absent',  label: 'Vắng',   color: '#dc3545' },
  { value: 'late',    label: 'Muộn',   color: '#ffc107' },
  { value: 'excused', label: 'Có phép', color: '#17a2b8' },
]

// ============================================================
// HELPERS
// ============================================================

function mapStatus(status: unknown): AttendanceStatus {
  if (!status) return 'present'
  const s = String(status).toUpperCase()
  if (s === 'PRESENT') return 'present'
  if (s === 'ABSENT')  return 'absent'
  if (s === 'LATE')    return 'late'
  if (s === 'EXCUSED') return 'excused'
  return 'present'
}

function toBackendStatus(frontendStatus: AttendanceStatus): string {
  switch (frontendStatus) {
    case 'present': return 'Present'
    case 'absent':  return 'Absent'
    case 'late':    return 'Late'
    case 'excused': return 'Excused'
    default:        return 'Present'
  }
}

function getIsoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

function formatTime(t: unknown): string {
  if (!t) return ''
  return String(t).substring(0, 5)
}

function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getBackendWeekday(): number {
  const day = new Date().getDay()
  return day === 0 ? 1 : day + 1
}

function extractAttendanceDate(a: Record<string, unknown>): string {
  const d = (a.attendanceDate ?? a.attendance_date ?? a.date) as string | undefined
  if (!d) return ''
  const ds = new Date(d)
  if (isNaN(ds.getTime())) return ''
  return `${ds.getFullYear()}-${String(ds.getMonth() + 1).padStart(2, '0')}-${String(ds.getDate()).padStart(2, '0')}`
}

// ============================================================
// COMPONENT
// ============================================================

export default function AttendancePage(): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [lecturerId, setLecturerId] = useState<number | null>(null)
  const [lecturerIdError, setLecturerIdError] = useState<string | null>(null)
  const [openSessionId, setOpenSessionId] = useState<number | string | null>(null)
  const [sessionStudents, setSessionStudents] = useState<Record<string, SessionStudent[]>>({})
  const [sessionSaved, setSessionSaved] = useState<Record<string, boolean>>({})
  const [loadingStudents, setLoadingStudents] = useState<Record<string, boolean>>({})

  const today = getTodayString()
  const iso = getIsoWeek(new Date())
  const weekday = getBackendWeekday()

  // Load lecturerId from current user
  useEffect(() => {
    const lid = (user?.lecturerId ?? user?.relatedId) as number | undefined
    if (lid) {
      setLecturerId(lid)
      return
    }
    if (!user?.userId) {
      setLecturerIdError('Không tìm thấy thông tin userId')
      return
    }
    lecturerApi.getAll()
      .then(r => {
        const raw = r.data
        const list: Lecturer[] = Array.isArray(raw) ? raw : (raw?.data as Lecturer[] | undefined) ?? []
        const found = list.find(
          l => (l.lecturerId as number | string | undefined) === user.userId
        )
        if (found) setLecturerId(found.lecturerId as number)
        else setLecturerIdError('Không tìm thấy thông tin giảng viên')
      })
      .catch(() => setLecturerIdError('Không tìm thấy thông tin giảng viên'))
  }, [user])

  // Fetch today's sessions from timetable
  const { data: rawSchedule = [] } = useQuery<Session[]>({
    queryKey: ['lecturer-week-schedule', lecturerId, iso.year, iso.week],
    queryFn: () => {
      if (!lecturerId) return Promise.resolve([])
      return timetableApi.getLecturerWeek(lecturerId, iso.year, iso.week).then(r => {
        const d = r.data
        const data: Session[] = Array.isArray(d)
          ? d
          : ((d as Record<string, unknown>)?.data as Session[] | undefined) ?? []
        return (data as Session[])
          .filter((s: Session) => {
            const w = (s as Record<string, unknown>).weekday as number | undefined
            return w === weekday
          })
          .sort((a: Session, b: Session) => {
            const ta = ((a as Record<string, unknown>).start_time ?? a.startTime) as string ?? ''
            const tb = ((b as Record<string, unknown>).start_time ?? b.startTime) as string ?? ''
            return ta.localeCompare(tb)
          })
          .map((s: Session & Record<string, unknown>) => ({
            sessionId: (s.session_id ?? s.sessionId) as number | string,
            classId:   (s.class_id   ?? s.classId)   as number | string,
            subjectName: (s.subject_name ?? s.subjectName) as string ?? 'N/A',
            className:   (s.class_name   ?? s.className)   as string ?? 'N/A',
            room:        (s.room_code    ?? s.roomCode)    as string ?? 'N/A',
            startTime:   formatTime(s.start_time ?? s.startTime),
            endTime:     formatTime(s.end_time   ?? s.endTime),
          }))
      })
    },
    enabled: !!lecturerId,
    staleTime: 30 * 1000,
  })

  // Check which sessions already have attendance saved today
  const { data: checkedSessions = [] } = useQuery<(Session & { attendanceSaved: boolean })[]>({
    queryKey: ['checked-sessions', rawSchedule, today],
    queryFn: async () => {
      const results = await Promise.all(
        rawSchedule.map(async (s: Session) => {
          if (!s.sessionId) return { ...s, attendanceSaved: false }
          try {
            const r = await attendanceApi.getBySchedule(s.sessionId as number)
            const atts: Record<string, unknown>[] = Array.isArray(r.data)
              ? r.data
              : ((r.data as Record<string, unknown>)?.data as Record<string, unknown>[] | undefined) ?? []
            const todayAtts = atts.filter(a => extractAttendanceDate(a) === today)
            return { ...s, attendanceSaved: todayAtts.length > 0 }
          } catch {
            return { ...s, attendanceSaved: false }
          }
        })
      )
      return results
    },
    enabled: rawSchedule.length > 0,
    staleTime: 0,
  })

  // Save mutation
  const saveMutation = useMutation<void, Error, SavePayload>({
    mutationFn: async ({ session, students }) => {
      const r = await attendanceApi.getBySchedule(session.sessionId as number)
      const atts: Record<string, unknown>[] = Array.isArray(r.data)
        ? r.data
        : ((r.data as Record<string, unknown>)?.data as Record<string, unknown>[] | undefined) ?? []
      const todayAtts = atts.filter(a => extractAttendanceDate(a) === today)
      const attMap: Record<number, number | string> = {}
      todayAtts.forEach(a => {
        const sid = (a.student_id ?? a.studentId) as number
        attMap[sid] = (a.attendanceId ?? a.attendance_id) as number | string
      })

      const now = new Date()
      const offset = -now.getTimezoneOffset()
      const sign = offset >= 0 ? '+' : '-'
      const abs = Math.abs(offset)
      const oh = String(Math.floor(abs / 60)).padStart(2, '0')
      const om = String(abs % 60).padStart(2, '0')
      const offsetStr = `${sign}${oh}:${om}`
      const dtStr = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
        'T',
        String(now.getHours()).padStart(2, '0'),
        ':',
        String(now.getMinutes()).padStart(2, '0'),
        ':',
        String(now.getSeconds()).padStart(2, '0'),
        offsetStr,
      ].join('')

      const promises = students.map(student => {
        const existingId = attMap[student.studentId]
        if (existingId) {
          return attendanceApi.update(existingId as number, {
            status: toBackendStatus(student.status) as AttendanceStatus,
            notes:  student.note || null,
          })
        }
        return attendanceApi.create({
          studentId:      student.studentId,
          scheduleId:     session.sessionId as number,
          attendanceDate: dtStr,
          status:         toBackendStatus(student.status) as AttendanceStatus,
          notes:          student.note || undefined,
          markedBy:       user?.username ?? String(user?.userId ?? 'lecturer'),
        })
      })
      await Promise.all(promises)
    },
    onSuccess: (_, { session }) => {
      toast.success('Lưu điểm danh thành công!')
      setSessionSaved(prev => ({ ...prev, [session.sessionId as string]: true }))
      setOpenSessionId(null)
      queryClient.invalidateQueries({ queryKey: ['checked-sessions'] })
    },
    onError: (err: Error) => {
      const msg =
        (err as unknown as { response?: { data?: { message?: string; error?: string } } })
          .response?.data?.message
        ?? (err as unknown as { response?: { data?: { message?: string; error?: string } } })
          .response?.data?.error
        ?? 'Lỗi khi lưu điểm danh'
      toast.error(msg)
    },
  })

  // Load student roster when opening a session
  const openSession = useCallback(async (session: Session) => {
    if (openSessionId === session.sessionId) {
      setOpenSessionId(null)
      return
    }
    if (sessionSaved[session.sessionId as string]) {
      toast('Lớp học này đã được điểm danh', { icon: 'ℹ️' })
      return
    }
    setOpenSessionId(session.sessionId)
    if (sessionStudents[session.sessionId as string]) return

    setLoadingStudents(prev => ({ ...prev, [session.sessionId as string]: true }))

    try {
      const [rosterRes, attRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (enrollmentApi as any).getClassRoster?.(session.classId)
          ?? enrollmentApi.getByClass(session.classId),
        session.sessionId
          ? attendanceApi.getBySchedule(session.sessionId as number).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rosterRaw: any[] = Array.isArray(rosterRes.data)
        ? rosterRes.data
        : ((rosterRes.data as Record<string, unknown>)?.data as unknown[]) ?? []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const atts: any[] = Array.isArray(attRes.data)
        ? attRes.data
        : ((attRes.data as Record<string, unknown>)?.data as unknown[]) ?? []
      const todayAtts = atts.filter(a => extractAttendanceDate(a) === today)
      const attMap: Record<number, { status: AttendanceStatus; note: string }> = {}
      todayAtts.forEach(a => {
        const sid = (a.student_id ?? a.studentId) as number
        attMap[sid] = { status: mapStatus(a.status), note: (a.notes ?? a.note ?? '') as string }
      })

      const students: SessionStudent[] = rosterRaw.map(enrollment => {
        const student: Record<string, unknown> =
          (enrollment as Record<string, unknown>).student as Record<string, unknown> ?? {}
        const studentId = (student.studentId ?? (enrollment as Record<string, unknown>).studentId) as number
        const existing = attMap[studentId]
        return {
          id:         studentId,
          studentId,
          studentCode: (student.studentCode ?? (enrollment as Record<string, unknown>).studentCode ?? 'N/A') as string,
          fullName:    (student.fullName ?? (enrollment as Record<string, unknown>).fullName ?? 'N/A') as string,
          status:     existing ? existing.status : 'present',
          note:       existing ? existing.note : '',
        }
      })

      setSessionStudents(prev => ({ ...prev, [session.sessionId as string]: students }))
    } catch {
      toast.error('Không thể tải danh sách sinh viên')
      setSessionStudents(prev => ({ ...prev, [session.sessionId as string]: [] }))
    } finally {
      setLoadingStudents(prev => ({ ...prev, [session.sessionId as string]: false }))
    }
  }, [openSessionId, sessionStudents, sessionSaved, today])

  const handleStatusChange = (sessionId: number | string, studentId: number, status: AttendanceStatus) => {
    setSessionStudents(prev => ({
      ...prev,
      [sessionId as string]: (prev[sessionId as string] ?? []).map(s =>
        s.studentId === studentId ? { ...s, status } : s
      ),
    }))
  }

  const handleNoteChange = (sessionId: number | string, studentId: number, note: string) => {
    setSessionStudents(prev => ({
      ...prev,
      [sessionId as string]: (prev[sessionId as string] ?? []).map(s =>
        s.studentId === studentId ? { ...s, note } : s
      ),
    }))
  }

  const markAllPresent = (session: Session) => {
    setSessionStudents(prev => ({
      ...prev,
      [session.sessionId as string]: (prev[session.sessionId as string] ?? []).map(s => ({
        ...s,
        status: 'present' as AttendanceStatus,
      })),
    }))
  }

  const getCount = (session: Session, status: AttendanceStatus): number => {
    const list = sessionStudents[session.sessionId as string] ?? []
    return list.filter(s => s.status === status).length
  }

  const handleSave = (session: Session) => {
    const students = sessionStudents[session.sessionId as string]
    if (!students || students.length === 0) {
      toast.error('Không có sinh viên để điểm danh')
      return
    }
    if (!window.confirm(`Lưu điểm danh cho ${students.length} sinh viên?`)) return
    saveMutation.mutate({ session, students })
  }

  const todayLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const isLoading = false // derived from checkedSessions loading state

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-clipboard-list"></i> Điểm danh</h1>
        <p className="text-muted">{todayLabel}</p>
      </div>

      {lecturerIdError && (
        <div className="alert alert-danger">{lecturerIdError}</div>
      )}

      {checkedSessions.length === 0 && !lecturerIdError && (
        <div className="text-center py-5"><i className="fas fa-spinner fa-spin fa-2x"></i></div>
      )}

      {!isLoading && !lecturerIdError && checkedSessions.length === 0 && (
        <div className="alert alert-info">Không có buổi học nào hôm nay.</div>
      )}

      <div className="session-list">
        {checkedSessions.map((session) => {
          const sid = session.sessionId as string
          return (
            <div key={session.sessionId ?? session.classId} className="card mb-3">
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
                  {sessionSaved[sid] ? (
                    <span className="badge badge-success"><i className="fas fa-check"></i> Đã điểm danh</span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => openSession(session)}
                      disabled={!!loadingStudents[sid]}
                    >
                      {loadingStudents[sid]
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
                        <span
                          key={opt.value}
                          className="badge me-2"
                          style={{ background: opt.color, color: '#fff' }}
                        >
                          {opt.label}: {getCount(session, opt.value)}
                        </span>
                      ))}
                    </div>
                    <button
                      className="btn btn-outline-success btn-sm"
                      onClick={() => markAllPresent(session)}
                    >
                      <i className="fas fa-check-circle"></i> Tất cả có mặt
                    </button>
                  </div>

                  {loadingStudents[sid] ? (
                    <div className="text-center py-3">
                      <i className="fas fa-spinner fa-spin"></i> Đang tải danh sách...
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Mã SV</th>
                            <th>Họ tên</th>
                            <th>Trạng thái</th>
                            <th>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(sessionStudents[sid] ?? []).map(student => (
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
                                      onClick={() =>
                                        handleStatusChange(session.sessionId as string, student.studentId, opt.value)
                                      }
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
                                  value={student.note}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    handleNoteChange(session.sessionId as string, student.studentId, e.target.value)
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-3 text-end">
                    <button className="btn btn-secondary btn-sm me-2" onClick={() => setOpenSessionId(null)}>
                      Đóng
                    </button>
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
          )
        })}
      </div>
    </div>
  )
}
