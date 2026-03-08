import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/AuthContext'
import attendanceApi from '../../../api/attendanceApi'

const STATUS_MAP = {
  present: { label: 'Có mặt', color: '#28a745', badge: 'badge-success' },
  absent:  { label: 'Vắng',    color: '#dc3545', badge: 'badge-danger' },
  late:    { label: 'Muộn',    color: '#ffc107', badge: 'badge-warning' },
  excused: { label: 'Có phép', color: '#17a2b8', badge: 'badge-info' },
}

function mapStatus(s) {
  if (!s) return 'present'
  const u = String(s).toUpperCase()
  if (u === 'PRESENT') return 'present'
  if (u === 'ABSENT') return 'absent'
  if (u === 'LATE') return 'late'
  if (u === 'EXCUSED') return 'excused'
  return 'present'
}

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getPages(currentPage, totalPages) {
  const pages = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export default function StudentAttendancePage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [filterMonth, setFilterMonth] = useState('')
  const pageSize = 15

  const studentId = user?.studentId || user?.relatedId

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ['student-attendance', studentId, filterMonth],
    queryFn: () => {
      if (!studentId) return Promise.resolve([])
      const params = {}
      if (filterMonth) params.month = filterMonth
      return attendanceApi.getByStudent(studentId, params).then(r => {
        const d = r.data
        return Array.isArray(d) ? d : (d?.data || d?.items || [])
      })
    },
    enabled: !!studentId,
    staleTime: 30 * 1000,
  })

  const records = Array.isArray(rawData) ? rawData : []

  // Client-side month filter
  const filtered = filterMonth
    ? records.filter(r => {
        const d = new Date(r.attendanceDate || r.attendance_date || r.date)
        if (isNaN(d.getTime())) return false
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return m === filterMonth
      })
    : records

  // Compute stats
  const stats = filtered.reduce((acc, r) => {
    const s = mapStatus(r.status)
    acc[s] = (acc[s] || 0) + 1
    acc.total++
    return acc
  }, { present: 0, absent: 0, late: 0, excused: 0, total: 0 })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-clipboard-list"></i> Lịch sử điểm danh</h1>
        <p className="text-muted">Xem lịch sử điểm danh cá nhân</p>
      </div>

      {/* Stats */}
      {!isLoading && stats.total > 0 && (
        <div className="row mb-3">
          {Object.entries(STATUS_MAP).map(([key, val]) => (
            <div className="col-md-3 col-6 mb-2" key={key}>
              <div className="card text-center">
                <div className="card-body py-2">
                  <div className="h4 mb-0" style={{ color: val.color }}>{stats[key] || 0}</div>
                  <small className="text-muted">{val.label}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body py-2 d-flex align-items-center gap-2">
          <label className="mb-0"><strong>Lọc theo tháng:</strong></label>
          <input
            type="month"
            className="form-control"
            style={{ maxWidth: 200 }}
            value={filterMonth}
            onChange={e => { setFilterMonth(e.target.value); setPage(1) }}
          />
          {filterMonth && (
            <button className="btn btn-outline-secondary btn-sm" onClick={() => { setFilterMonth(''); setPage(1) }}>
              <i className="fas fa-times"></i> Xóa lọc
            </button>
          )}
          <span className="ms-auto text-muted small">
            Tổng: {stats.total} buổi
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Môn học</th>
                  <th>Lớp</th>
                  <th>Giảng viên</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="6" className="text-center"><i className="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-muted">Không có dữ liệu điểm danh</td></tr>
                ) : (
                  paginated.map((record, idx) => {
                    const s = mapStatus(record.status)
                    const info = STATUS_MAP[s]
                    return (
                      <tr key={record.attendanceId || record.attendance_id || idx}>
                        <td>{formatDate(record.attendanceDate || record.attendance_date || record.date)}</td>
                        <td>{record.subjectName || record.subject_name || '—'}</td>
                        <td>{record.className || record.class_name || '—'}</td>
                        <td>{record.lecturerName || record.lecturer_name || '—'}</td>
                        <td>
                          <span className={`badge ${info.badge}`} style={{ color: '#fff' }}>
                            {info.label}
                          </span>
                        </td>
                        <td className="text-muted small">{record.notes || record.note || '—'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {stats.total > pageSize && (
            <div className="pagination-container">
              <div className="pagination-info">
                Hiển thị {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, stats.total)} / {stats.total}
              </div>
              <div className="pagination">
                <button className="btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <i className="fas fa-chevron-left"></i> Trước
                </button>
                {getPages(safePage, totalPages).map(p => (
                  <button key={p} className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                ))}
                <button className="btn btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  Sau <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
