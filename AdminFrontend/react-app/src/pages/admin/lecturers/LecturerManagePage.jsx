import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import lecturerApi from '../../../api/lecturerApi'

function getPages(currentPage, totalPages) {
  const pages = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export default function LecturerManagePage() {
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('lecturers')
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Lecturer modal
  const [showLecturerModal, setShowLecturerModal] = useState(false)
  const [editingLecturer, setEditingLecturer] = useState(null)
  const [lecturerForm, setLecturerForm] = useState({
    fullName: '', email: '', phone: '', departmentId: '', joinDate: '', isActive: true,
  })
  const [formErrors, setFormErrors] = useState({})

  // Assign subject modal
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedLecturer, setSelectedLecturer] = useState(null)
  const [lecturerSubjects, setLecturerSubjects] = useState([])
  const [availableSubjects, setAvailableSubjects] = useState([])
  const [newSubject, setNewSubject] = useState({ subjectId: '', isPrimary: false, experienceYears: 0, notes: '' })

  // Fetch lecturers
  const { data: lecturers = [], isLoading } = useQuery({
    queryKey: ['lecturers'],
    queryFn: () => lecturerApi.getAll().then(r => r.data?.data || r.data || []),
    staleTime: 30 * 1000,
  })

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => lecturerApi.getDepartments().then(r => r.data?.data || r.data || []),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch all subjects
  const { data: allSubjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => lecturerApi.getSubjects().then(r => {
      const d = r.data?.data || r.data?.items || r.data || []
      return Array.isArray(d) ? d : []
    }),
    staleTime: 5 * 60 * 1000,
  })

  // Save lecturer mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!lecturerForm.fullName || !lecturerForm.email || !lecturerForm.departmentId)
        throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc')
      const method = editingLecturer ? 'update' : 'create'
      const payload = {
        ...lecturerForm,
        departmentId: lecturerForm.departmentId,
        joinDate: lecturerForm.joinDate ? new Date(lecturerForm.joinDate + 'T00:00:00').toISOString() : null,
      }
      return editingLecturer
        ? lecturerApi.update(editingLecturer.lecturerId, payload)
        : lecturerApi.create(payload)
    },
    onSuccess: () => {
      toast.success('Lưu giảng viên thành công!')
      setShowLecturerModal(false)
      setLecturerForm({ fullName: '', email: '', phone: '', departmentId: '', joinDate: '', isActive: true })
      setEditingLecturer(null)
      queryClient.invalidateQueries({ queryKey: ['lecturers'] })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Lỗi khi lưu giảng viên')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => lecturerApi.delete(id),
    onSuccess: () => {
      toast.success('Xóa giảng viên thành công!')
      queryClient.invalidateQueries({ queryKey: ['lecturers'] })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Không thể xóa giảng viên')
    },
  })

  // Fetch lecturer subjects
  const fetchLecturerSubjects = (lecturer) => {
    lecturerApi.getLecturerSubjects(lecturer.lecturerId).then(r => {
      const subs = r.data?.data || r.data || []
      setLecturerSubjects(Array.isArray(subs) ? subs : [])
      const assignedIds = subs.map(s => s.subjectId || s.SubjectId || s.subject?.subjectId)
      setAvailableSubjects(allSubjects.filter(s => !assignedIds.includes(s.subjectId)))
    }).catch(() => setLecturerSubjects([]))
  }

  // Assign subject mutation
  const assignMutation = useMutation({
    mutationFn: (data) => lecturerApi.assignSubject(data),
    onSuccess: () => {
      toast.success('Phân môn thành công!')
      if (selectedLecturer) fetchLecturerSubjects(selectedLecturer)
      setNewSubject({ subjectId: '', isPrimary: false, experienceYears: 0, notes: '' })
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Lỗi khi phân môn'),
  })

  // Remove subject mutation
  const removeMutation = useMutation({
    mutationFn: (id) => lecturerApi.removeSubject(id),
    onSuccess: () => {
      toast.success('Đã bỏ môn học!')
      if (selectedLecturer) fetchLecturerSubjects(selectedLecturer)
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Lỗi khi bỏ môn'),
  })

  // Filter
  const filtered = lecturers.filter(l => {
    const s = search.toLowerCase()
    const matchSearch = !s ||
      (l.fullName || '').toLowerCase().includes(s) ||
      (l.email || '').toLowerCase().includes(s) ||
      (l.lecturerCode || '').toLowerCase().includes(s)
    const matchDept = !filterDept || l.departmentId === filterDept
    return matchSearch && matchDept
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function openAddModal() {
    setEditingLecturer(null)
    setLecturerForm({ fullName: '', email: '', phone: '', departmentId: '', joinDate: '', isActive: true })
    setFormErrors({})
    setShowLecturerModal(true)
  }

  function openEditModal(lec) {
    const fmt = (d) => {
      if (!d) return ''
      try {
        const date = new Date(d)
        if (isNaN(date.getTime())) return ''
        return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
      } catch { return '' }
    }
    setEditingLecturer(lec)
    setLecturerForm({
      fullName: lec.fullName || '',
      email: lec.email || '',
      phone: lec.phone || '',
      departmentId: lec.departmentId || '',
      joinDate: fmt(lec.joinDate),
      isActive: lec.isActive ?? true,
    })
    setFormErrors({})
    setShowLecturerModal(true)
  }

  function validateForm() {
    const errs = {}
    if (!lecturerForm.fullName) errs.fullName = 'Họ tên bắt buộc'
    if (!lecturerForm.email) errs.email = 'Email bắt buộc'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lecturerForm.email)) errs.email = 'Email không hợp lệ'
    if (!lecturerForm.departmentId) errs.departmentId = 'Vui lòng chọn bộ môn'
    return errs
  }

  function handleSaveLecturer() {
    const errs = validateForm()
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    saveMutation.mutate()
  }

  function handleDelete(id) {
    if (!window.confirm('Bạn có chắc muốn xóa giảng viên này?')) return
    deleteMutation.mutate(id)
  }

  function openAssignModal(lec) {
    setSelectedLecturer(lec)
    fetchLecturerSubjects(lec)
    setNewSubject({ subjectId: '', isPrimary: false, experienceYears: 0, notes: '' })
    setShowAssignModal(true)
  }

  function handleAssignSubject() {
    if (!newSubject.subjectId) { toast.error('Vui lòng chọn môn học'); return }
    assignMutation.mutate({
      lecturerId: selectedLecturer.lecturerId,
      subjectId: newSubject.subjectId,
      isPrimary: newSubject.isPrimary,
      experienceYears: Number(newSubject.experienceYears) || 0,
      notes: newSubject.notes || '',
      certifiedDate: new Date().toISOString(),
    })
  }

  function handleRemoveSubject(lsId) {
    if (!window.confirm('Bỏ môn học khỏi giảng viên này?')) return
    removeMutation.mutate(lsId)
  }

  return (
    <div>
      {/* Tabs */}
      <div className="filter-bar" style={{ marginBottom: 8 }}>
        <button className={`btn ${activeTab === 'lecturers' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('lecturers')}>
          <i className="fas fa-chalkboard-teacher"></i> Giảng viên
        </button>
        <button className={`btn ${activeTab === 'subjects' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('subjects')}>
          <i className="fas fa-book"></i> Phân môn cho GV
        </button>
      </div>

      {/* ── Lecturers Tab ── */}
      {activeTab === 'lecturers' && (
        <>
          <div className="filter-bar">
            <div className="filter-group" style={{ flex: 1 }}>
              <input type="text" className="form-control" placeholder="Tìm kiếm theo tên, email, mã GV..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <div className="filter-group">
              <select className="form-control" value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1) }}>
                <option value="">Tất cả bộ môn</option>
                {departments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
              </select>
              <button className="btn btn-primary" onClick={openAddModal}>
                <i className="fas fa-plus"></i> Thêm GV
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã GV</th><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Bộ môn</th><th>Trạng thái</th><th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan="7" className="text-center"><i className="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
                    ) : paginated.length === 0 ? (
                      <tr><td colSpan="7" className="text-center">Không có dữ liệu</td></tr>
                    ) : (
                      paginated.map(l => (
                        <tr key={l.lecturerId}>
                          <td><strong>{l.lecturerCode}</strong></td>
                          <td>{l.fullName}</td>
                          <td>{l.email}</td>
                          <td>{l.phone}</td>
                          <td>{l.departmentName}</td>
                          <td>
                            <span className={`badge ${l.isActive ? 'badge-success' : 'badge-danger'}`}>
                              {l.isActive ? 'Hoạt động' : 'Khóa'}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button className="btn btn-sm btn-outline-primary" onClick={() => openAssignModal(l)} title="Phân môn">
                                <i className="fas fa-book"></i>
                              </button>
                              <button className="btn btn-sm btn-primary" onClick={() => openEditModal(l)}>
                                <i className="fas fa-edit"></i> Sửa
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(l.lecturerId)}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filtered.length > 0 && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    Hiển thị {(safePage-1)*pageSize+1}–{Math.min(safePage*pageSize, filtered.length)} / {filtered.length}
                  </div>
                  <div className="pagination">
                    <button className="btn btn-sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={safePage===1}>
                      <i className="fas fa-chevron-left"></i> Trước
                    </button>
                    {getPages(safePage, totalPages).map(p => (
                      <button key={p} className={`btn btn-sm ${p===safePage?'btn-primary':'btn-outline'}`} onClick={() => setPage(p)}>{p}</button>
                    ))}
                    <button className="btn btn-sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={safePage===totalPages}>
                      Sau <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Subjects Tab ── */}
      {activeTab === 'subjects' && (
        <>
          <div className="card">
            <div className="card-body">
              <h5 className="mb-3"><i className="fas fa-book"></i> Danh sách môn học & Giảng viên phụ trách</h5>
              {allSubjects.length === 0 ? (
                <div className="text-center text-muted">Không có môn học nào.</div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr><th>Mã môn</th><th>Tên môn</th><th>Số tín chỉ</th><th>Giảng viên phụ trách</th><th>Thao tác</th></tr>
                    </thead>
                    <tbody>
                      {allSubjects.map(s => (
                        <tr key={s.subjectId}>
                          <td><strong>{s.subjectCode}</strong></td>
                          <td>{s.subjectName}</td>
                          <td>{s.credits}</td>
                          <td>
                            {s.assignedLecturers?.length > 0
                              ? s.assignedLecturers.map((al, i) => (
                                  <span key={i} className="badge badge-info me-1">
                                    {al.fullName || al.lecturer?.fullName}
                                    {(al.isPrimary || al.LecturerSubject?.isPrimary) ? ' ★' : ''}
                                  </span>
                                ))
                              : <span className="text-muted">—</span>
                            }
                          </td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => {
                              const firstLec = s.assignedLecturers?.[0]
                              if (firstLec) {
                                const lecId = firstLec.lecturerId || firstLec.lecturer?.lecturerId
                                const lec = lecturers.find(l => l.lecturerId === lecId)
                                if (lec) openAssignModal(lec)
                              }
                            }}>
                              <i className="fas fa-edit"></i> Quản lý
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Lecturer Modal */}
      {showLecturerModal && (
        <div className="modal-overlay" onClick={() => setShowLecturerModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{editingLecturer ? 'Chỉnh sửa giảng viên' : 'Thêm giảng viên mới'}</h4>
              <button className="btn-close" onClick={() => setShowLecturerModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-3">
                <label>Họ tên <span className="text-danger">*</span></label>
                <input className={`form-control${formErrors.fullName ? ' is-invalid' : ''}`}
                  value={lecturerForm.fullName}
                  onChange={e => setLecturerForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Họ và tên đầy đủ" />
                {formErrors.fullName && <div className="invalid-feedback d-block">{formErrors.fullName}</div>}
              </div>
              <div className="form-group mb-3">
                <label>Email <span className="text-danger">*</span></label>
                <input className={`form-control${formErrors.email ? ' is-invalid' : ''}`}
                  type="email"
                  value={lecturerForm.email}
                  onChange={e => setLecturerForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@edu.vn" />
                {formErrors.email && <div className="invalid-feedback d-block">{formErrors.email}</div>}
              </div>
              <div className="form-group mb-3">
                <label>Số điện thoại</label>
                <input className="form-control"
                  value={lecturerForm.phone}
                  onChange={e => setLecturerForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="0xxxxxxxxx" />
              </div>
              <div className="form-group mb-3">
                <label>Bộ môn <span className="text-danger">*</span></label>
                <select className={`form-control${formErrors.departmentId ? ' is-invalid' : ''}`}
                  value={lecturerForm.departmentId}
                  onChange={e => setLecturerForm(f => ({ ...f, departmentId: e.target.value }))}>
                  <option value="">-- Chọn bộ môn --</option>
                  {departments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
                </select>
                {formErrors.departmentId && <div className="invalid-feedback d-block">{formErrors.departmentId}</div>}
              </div>
              <div className="form-group mb-3">
                <label>Ngày vào làm</label>
                <input className="form-control" type="date"
                  value={lecturerForm.joinDate}
                  onChange={e => setLecturerForm(f => ({ ...f, joinDate: e.target.value }))} />
              </div>
              {editingLecturer && (
                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox"
                    id="lecActive"
                    checked={lecturerForm.isActive}
                    onChange={e => setLecturerForm(f => ({ ...f, isActive: e.target.checked }))}
                    style={{ width: 40, height: 20, cursor: 'pointer' }} />
                  <label className="form-check-label" htmlFor="lecActive">
                    {lecturerForm.isActive ? 'Hoạt động' : 'Khóa'}
                  </label>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLecturerModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveLecturer} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</> : <><i className="fas fa-save"></i> Lưu</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Subject Modal */}
      {showAssignModal && selectedLecturer && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h4>Phân môn cho: {selectedLecturer.fullName}</h4>
              <button className="btn-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <h6>Môn đã phân ({lecturerSubjects.length})</h6>
              {lecturerSubjects.length === 0 ? (
                <p className="text-muted">Chưa có môn nào.</p>
              ) : (
                <table className="table table-sm table-bordered mb-3">
                  <thead className="table-light"><tr><th>Môn</th><th>Chính</th><th></th></tr></thead>
                  <tbody>
                    {lecturerSubjects.map(ls => (
                      <tr key={ls.lecturerSubjectId || ls.LecturerSubjectId}>
                        <td>{ls.subjectName || ls.subject?.subjectName}</td>
                        <td>{ls.isPrimary || ls.LecturerSubject?.isPrimary ? '★' : ''}</td>
                        <td>
                          <button className="btn btn-sm btn-danger" onClick={() => handleRemoveSubject(ls.lecturerSubjectId || ls.LecturerSubjectId)}>
                            <i className="fas fa-times"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <hr />
              <h6>Thêm môn mới</h6>
              <div className="row g-2">
                <div className="col-md-6">
                  <select className="form-control"
                    value={newSubject.subjectId}
                    onChange={e => setNewSubject(s => ({ ...s, subjectId: e.target.value }))}>
                    <option value="">-- Chọn môn --</option>
                    {availableSubjects.map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectCode} - {s.subjectName}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <input className="form-control" type="number" placeholder="Số năm KN"
                    value={newSubject.experienceYears}
                    onChange={e => setNewSubject(s => ({ ...s, experienceYears: e.target.value }))} />
                </div>
                <div className="col-md-3">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox"
                      id="isPrimary"
                      checked={newSubject.isPrimary}
                      onChange={e => setNewSubject(s => ({ ...s, isPrimary: e.target.checked }))}
                      style={{ width: 40, height: 20 }} />
                    <label className="form-check-label" htmlFor="isPrimary">Môn chính</label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Đóng</button>
              <button className="btn btn-primary" onClick={handleAssignSubject} disabled={assignMutation.isPending}>
                {assignMutation.isPending ? <><i className="fas fa-spinner fa-spin"></i>...</> : <><i className="fas fa-plus"></i> Thêm môn</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
