import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import classApi from '../../../api/classApi'
import lookupApi from '../../../api/lookupApi'
import scheduleApi from '../../../api/scheduleApi'

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const PERIOD_TIMES = {
  1:  { start: '07:00', end: '07:50' },
  2:  { start: '07:55', end: '08:45' },
  3:  { start: '09:00', end: '09:50' },
  4:  { start: '09:55', end: '10:45' },
  5:  { start: '10:50', end: '11:40' },
  6:  { start: '11:45', end: '12:35' },
  7:  { start: '12:40', end: '13:30' },
  8:  { start: '13:35', end: '14:25' },
  9:  { start: '14:30', end: '15:20' },
  10: { start: '15:25', end: '16:15' },
  11: { start: '16:20', end: '17:10' },
  12: { start: '17:15', end: '18:05' },
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

function timeToApi(t) {
  if (!t) return null
  const s = String(t)
  if (s.length === 5) return s + ':00'
  if (s.length === 8) return s
  return null
}

export default function AdminTimetablePage() {
  const queryClient = useQueryClient()

  const today = new Date()
  const iso = getIsoWeek(today)

  const [year, setYear] = useState(iso.year)
  const [week, setWeek] = useState(iso.week)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [classSearch, setClassSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [form, setForm] = useState({
    classId: '', subjectId: '', lecturerId: '', roomId: '',
    weekday: 2, periodFrom: 1, periodTo: 3,
    startTime: '07:00', endTime: '09:00',
    notes: '',
  })
  const [conflictResult, setConflictResult] = useState(null)
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  // Fetch classes for dropdown
  const { data: rawClasses = [] } = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: () => classApi.getAll({ pageSize: 500 }).then(r => {
      const d = r.data
      return Array.isArray(d) ? d : (d?.data || d?.items || [])
    }),
    staleTime: 5 * 60 * 1000,
  })
  const allClasses = rawClasses
  const filteredClasses = classSearch
    ? allClasses.filter(c => {
        const s = classSearch.toLowerCase()
        return (c.classCode || '').toLowerCase().includes(s) ||
               (c.className || '').toLowerCase().includes(s) ||
               (c.subjectName || '').toLowerCase().includes(s)
      })
    : allClasses

  // Fetch subjects, lecturers, rooms in parallel
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-dropdown'], staleTime: 5 * 60 * 1000,
    queryFn: () => lookupApi.getSubjects().then(r => {
      const d = r.data
      return Array.isArray(d) ? d : (d?.data || d?.items || [])
    }),
  })
  const { data: lecturers = [] } = useQuery({
    queryKey: ['lecturers-dropdown'], staleTime: 5 * 60 * 1000,
    queryFn: () => lookupApi.getLecturers().then(r => {
      const d = r.data
      return Array.isArray(d) ? d : (d?.data || d?.items || [])
    }),
  })
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms-dropdown'], staleTime: 5 * 60 * 1000,
    queryFn: () => lookupApi.getRooms().then(r => {
      const d = r.data
      return Array.isArray(d) ? d : (d?.data || d?.items || [])
    }).catch(() => scheduleApi.getRooms(null, true).then(r => {
      const d = r.data
      return Array.isArray(d) ? d : (d?.data || d?.items || [])
    })),
  })

  // Fetch sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['admin-sessions', year, week, selectedClassId],
    queryFn: () => {
      const params = { year, week }
      if (selectedClassId) params.classId = selectedClassId
      return scheduleApi.getAllByWeek(year, week).then(r => {
        const d = r.data
        const data = Array.isArray(d) ? d : (d?.data || d?.items || [])
        return selectedClassId
          ? data.filter(s => (s.classId || s.class_id) == selectedClassId)
          : data
      })
    },
    staleTime: 30 * 1000,
  })

  // Build grid: weekday -> list of sessions
  const grid = {}
  for (let d = 1; d <= 7; d++) grid[d] = []
  sessions.forEach(s => {
    const wd = s.weekday
    if (wd >= 1 && wd <= 7) {
      grid[wd].push({
        ...s,
        startTime: formatTime(s.start_time || s.startTime || ''),
        endTime: formatTime(s.end_time || s.endTime || ''),
        classCode: s.class_code || s.classCode || '',
        className: s.class_name || s.className || '',
        subjectName: s.subject_name || s.subjectName || '',
        lecturerName: s.lecturer_name || s.lecturerName || '',
        roomCode: s.room_code || s.roomCode || '',
      })
    }
  })

  // Sort each day's sessions by startTime
  Object.keys(grid).forEach(d => {
    grid[d].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  })

  // Check conflicts mutation
  const checkMutation = useMutation({
    mutationFn: () => {
      const payload = {
        classId: form.classId || null,
        subjectId: form.subjectId || null,
        lecturerId: form.lecturerId || null,
        roomId: form.roomId || null,
        weekday: Number(form.weekday),
        startTime: timeToApi(form.startTime),
        endTime: timeToApi(form.endTime),
        periodFrom: form.periodFrom ? Number(form.periodFrom) : null,
        periodTo: form.periodTo ? Number(form.periodTo) : null,
        sessionId: editMode ? editingSession?.sessionId : null,
      }
      setCheckingConflicts(true)
      return scheduleApi.checkConflicts(payload)
    },
    onSuccess: (res) => {
      setCheckingConflicts(false)
      setConflictResult(res.data?.data || res.data)
      const cr = res.data?.data || res.data
      const hasConflict =
        (cr.lecturerConflicts?.length > 0) ||
        (cr.roomConflicts?.length > 0) ||
        (cr.studentConflicts?.length > 0) ||
        cr.isOverCapacity
      if (!hasConflict) toast.success('Không có xung đột! Có thể tạo phiên học.')
      else toast.warning('Phát hiện xung đột, xem chi tiết bên dưới.')
    },
    onError: (err) => {
      setCheckingConflicts(false)
      const msg = err.response?.data?.message || err.response?.data?.error || 'Lỗi kiểm tra xung đột'
      toast.error(msg)
    },
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        classId: form.classId,
        subjectId: form.subjectId,
        lecturerId: form.lecturerId || null,
        roomId: form.roomId || null,
        weekday: Number(form.weekday),
        startTime: timeToApi(form.startTime),
        endTime: timeToApi(form.endTime),
        periodFrom: Number(form.periodFrom),
        periodTo: Number(form.periodTo),
        notes: form.notes || null,
      }
      return editMode
        ? scheduleApi.update(editingSession.sessionId, payload)
        : scheduleApi.create(payload)
    },
    onSuccess: () => {
      toast.success(`${editMode ? 'Cập nhật' : 'Tạo'} phiên học thành công!`)
      setShowForm(false)
      setEditMode(false)
      setEditingSession(null)
      setConflictResult(null)
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] })
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Lỗi khi lưu'
      toast.error(msg)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => scheduleApi.delete(id),
    onSuccess: () => {
      toast.success('Xóa phiên học thành công!')
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi xóa phiên'),
  })

  // Helpers
  function updatePeriodDisplay(pf, pt) {
    if (pf && pt && PERIOD_TIMES[pf] && PERIOD_TIMES[pt]) {
      return `${PERIOD_TIMES[pf].start} – ${PERIOD_TIMES[pt].end}`
    }
    return ''
  }

  function openCreate() {
    setEditMode(false)
    setEditingSession(null)
    setConflictResult(null)
    setForm({
      classId: selectedClassId || '',
      subjectId: '', lecturerId: '', roomId: '',
      weekday: 2, periodFrom: 1, periodTo: 3,
      startTime: '07:00', endTime: '09:00', notes: '',
    })
    setShowForm(true)
  }

  function openEdit(s) {
    setEditMode(true)
    setEditingSession(s)
    setConflictResult(null)
    setForm({
      classId: s.classId || '',
      subjectId: s.subjectId || '',
      lecturerId: s.lecturerId || '',
      roomId: s.roomId || '',
      weekday: s.weekday || 2,
      periodFrom: s.periodFrom || 1,
      periodTo: s.periodTo || 3,
      startTime: formatTime(s.startTime || s.start_time || '07:00'),
      endTime: formatTime(s.endTime || s.end_time || '09:00'),
      notes: s.notes || '',
    })
    setShowForm(true)
  }

  function handleDelete(session) {
    if (!window.confirm('Xóa phiên học này?')) return
    deleteMutation.mutate(session.sessionId)
  }

  function handleFormPeriodChange(field, val) {
    const n = Number(val)
    setForm(f => {
      const next = { ...f, [field]: n }
      // Auto-update time from period
      if (next.periodFrom && next.periodTo && PERIOD_TIMES[next.periodFrom] && PERIOD_TIMES[next.periodTo]) {
        next.startTime = PERIOD_TIMES[next.periodFrom].start
        next.endTime = PERIOD_TIMES[next.periodTo].end
      }
      return next
    })
  }

  const periodDisplay = updatePeriodDisplay(form.periodFrom, form.periodTo)

  return (
    <div>
      <div className="page-header d-flex justify-content-between align-items-center">
        <div>
          <h1><i className="fas fa-clock"></i> Thời khóa biểu</h1>
          <p className="text-muted mb-0">Tuần {week} / Năm {year}</p>
        </div>
        {/* Week nav */}
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => {
            let w = week - 1, y = year
            if (w < 1) { w = 53; y-- }
            setWeek(w); setYear(y)
          }}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <input type="number" className="form-control form-control-sm" style={{ width: 70 }}
            value={week} min={1} max={53}
            onChange={e => setWeek(Math.max(1, Math.min(53, Number(e.target.value))))} />
          <span>–</span>
          <input type="number" className="form-control form-control-sm" style={{ width: 90 }}
            value={year} min={2000} max={2100}
            onChange={e => setYear(Number(e.target.value))} />
          <button className="btn btn-outline-secondary btn-sm" onClick={() => {
            let w = week + 1, y = year
            if (w > 53) { w = 1; y++ }
            setWeek(w); setYear(y)
          }}>
            <i className="fas fa-chevron-right"></i>
          </button>
          <button className="btn btn-primary btn-sm ms-2" onClick={openCreate}>
            <i className="fas fa-plus"></i> Thêm phiên
          </button>
        </div>
      </div>

      {/* Class filter */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-md-6">
              <label className="form-label mb-0"><strong>Lọc theo lớp:</strong></label>
            </div>
            <div className="col-md-6">
              <input type="text" className="form-control form-control-sm"
                placeholder="Tìm mã, tên lớp..."
                value={classSearch} onChange={e => setClassSearch(e.target.value)} />
            </div>
          </div>
          {classSearch && (
            <div className="mt-2" style={{ maxHeight: 150, overflowY: 'auto' }}>
              <div className="list-group list-group-flush">
                <button className="list-group-item list-group-item-action py-1 small"
                  onClick={() => { setSelectedClassId(''); setClassSearch('') }}>
                  — Xem tất cả —
                </button>
                {filteredClasses.slice(0, 20).map(c => (
                  <button key={c.classId} className={`list-group-item list-group-item-action py-1 small ${selectedClassId == c.classId ? 'active' : ''}`}
                    onClick={() => { setSelectedClassId(c.classId); setClassSearch('') }}>
                    <strong>{c.classCode}</strong> – {c.className}
                    {c.subjectName ? ` (${c.subjectName})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
          {selectedClassId && (
            <button className="btn btn-outline-secondary btn-sm mt-2" onClick={() => setSelectedClassId('')}>
              <i className="fas fa-times"></i> Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* Timetable grid */}
      <div className="card">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-5"><i className="fas fa-spinner fa-spin"></i> Đang tải...</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered mb-0" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Tiết</th>
                    {DAY_NAMES.map((d, i) => <th key={i}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 12 }, (_, pi) => {
                    const p = pi + 1
                    const periodInfo = PERIOD_TIMES[p]
                    return (
                      <tr key={p}>
                        <td className="text-center small text-muted">
                          <strong>T{p}</strong><br />
                          {periodInfo ? <span>{periodInfo.start}<br />–{periodInfo.end}</span> : ''}
                        </td>
                        {DAY_NAMES.map((_, di) => {
                          const wd = di === 0 ? 7 : di
                          const cellSessions = grid[wd]?.filter(s => {
                            const pf = s.periodFrom || 0
                            const pt = s.periodTo || 0
                            return p >= pf && p <= pt
                          }) || []
                          return (
                            <td key={di} className="position-relative" style={{ minHeight: 60 }}>
                              {cellSessions.length > 0 ? (
                                cellSessions.map((s, si) => (
                                  <div key={si} className="session-chip mb-1 p-1 rounded"
                                    style={{ background: '#e3f2fd', border: '1px solid #90caf9', fontSize: '0.75rem' }}>
                                    <div className="fw-bold">{s.classCode}</div>
                                    <div>{s.subjectName}</div>
                                    <div className="text-muted">{s.startTime}–{s.endTime}</div>
                                    {s.roomCode ? <div><i className="fas fa-map-marker-alt"></i> {s.roomCode}</div> : ''}
                                    <div className="mt-1">
                                      <button className="btn btn-xs btn-outline-primary py-0 px-1" style={{ fontSize: '0.65rem' }}
                                        onClick={() => openEdit(s)}>Sửa</button>
                                      <button className="btn btn-xs btn-outline-danger py-0 px-1 ms-1" style={{ fontSize: '0.65rem' }}
                                        onClick={() => handleDelete(s)}>Xóa</button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted small"></span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{editMode ? 'Chỉnh sửa phiên học' : 'Thêm phiên học mới'}</h4>
              <button className="btn-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group col-md-6 mb-3">
                  <label>Lớp học <span className="text-danger">*</span></label>
                  <select className="form-control" value={form.classId}
                    onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                    <option value="">— Chọn lớp —</option>
                    {allClasses.map(c => <option key={c.classId} value={c.classId}>{c.classCode} – {c.className}</option>)}
                  </select>
                </div>
                <div className="form-group col-md-6 mb-3">
                  <label>Môn học <span className="text-danger">*</span></label>
                  <select className="form-control" value={form.subjectId}
                    onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                    <option value="">— Chọn môn —</option>
                    {subjects.map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group col-md-6 mb-3">
                  <label>Giảng viên</label>
                  <select className="form-control" value={form.lecturerId}
                    onChange={e => setForm(f => ({ ...f, lecturerId: e.target.value }))}>
                    <option value="">— Chọn GV —</option>
                    {lecturers.map(l => <option key={l.lecturerId} value={l.lecturerId}>{l.fullName}</option>)}
                  </select>
                </div>
                <div className="form-group col-md-6 mb-3">
                  <label>Phòng</label>
                  <select className="form-control" value={form.roomId}
                    onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}>
                    <option value="">— Chọn phòng —</option>
                    {rooms.map(r => <option key={r.roomId} value={r.roomId}>{r.roomCode}{r.building ? ` (${r.building})` : ''}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group col-md-3 mb-3">
                  <label>Thứ</label>
                  <select className="form-control" value={form.weekday}
                    onChange={e => setForm(f => ({ ...f, weekday: Number(e.target.value) }))}>
                    {[{ v: 1, l: 'Chủ nhật' }, { v: 2, l: 'Thứ 2' }, { v: 3, l: 'Thứ 3' }, { v: 4, l: 'Thứ 4' }, { v: 5, l: 'Thứ 5' }, { v: 6, l: 'Thứ 6' }, { v: 7, l: 'Thứ 7' }].map(d => (
                      <option key={d.v} value={d.v}>{d.l}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-md-3 mb-3">
                  <label>Tiết bắt đầu</label>
                  <select className="form-control" value={form.periodFrom}
                    onChange={e => handleFormPeriodChange('periodFrom', e.target.value)}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(p => (
                      <option key={p} value={p}>Tiết {p} ({PERIOD_TIMES[p]?.start})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-md-3 mb-3">
                  <label>Tiết kết thúc</label>
                  <select className="form-control" value={form.periodTo}
                    onChange={e => handleFormPeriodChange('periodTo', e.target.value)}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(p => (
                      <option key={p} value={p}>Tiết {p} ({PERIOD_TIMES[p]?.end})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-md-3 mb-3">
                  <label>Giờ hiển thị</label>
                  <div className="form-control-plaintext small text-muted">{periodDisplay || '—'}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group col-md-6 mb-3">
                  <label>Giờ bắt đầu</label>
                  <input type="time" className="form-control" value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="form-group col-md-6 mb-3">
                  <label>Giờ kết thúc</label>
                  <input type="time" className="form-control" value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>
              <div className="form-group mb-3">
                <label>Ghi chú</label>
                <textarea className="form-control" rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {/* Conflict result */}
              {conflictResult && (
                <div className={`alert ${conflictResult.lecturerConflicts?.length || conflictResult.roomConflicts?.length || conflictResult.isOverCapacity ? 'alert-danger' : 'alert-success'} mb-0`}>
                  <strong>{conflictResult.lecturerConflicts?.length || conflictResult.roomConflicts?.length || conflictResult.isOverCapacity ? '⚠️ Xung đột phát hiện' : '✅ Không có xung đột'}</strong>
                  {conflictResult.lecturerConflicts?.length > 0 && (
                    <div className="mt-1"><small>GV: {conflictResult.lecturerConflicts.map(c => c.lecturerName).join(', ')}</small></div>
                  )}
                  {conflictResult.roomConflicts?.length > 0 && (
                    <div className="mt-1"><small>Phòng: {conflictResult.roomConflicts.map(c => c.roomCode).join(', ')}</small></div>
                  )}
                  {conflictResult.isOverCapacity && (
                    <div className="mt-1"><small>⚠️ Vượt sức chứa phòng</small></div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-info" onClick={() => checkMutation.mutate()} disabled={checkingConflicts}>
                {checkingConflicts ? <><i className="fas fa-spinner fa-spin"></i> Đang kiểm tra...</> : <><i className="fas fa-search"></i> Kiểm tra xung đột</>}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</> : <><i className="fas fa-save"></i> Lưu</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
