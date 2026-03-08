import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import advisorApi from '../../../api/advisorApi'

function getPages(currentPage, totalPages) {
  const pages = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export default function AdvisorManagePage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingAdvisor, setEditingAdvisor] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedAdvisor, setSelectedAdvisor] = useState(null)
  const [advisorForm, setAdvisorForm] = useState({
    fullName: '', email: '', phone: '', departmentId: '', isActive: true,
  })
  const [formErrors, setFormErrors] = useState({})

  // Fetch advisors
  const { data: advisors = [], isLoading } = useQuery({
    queryKey: ['advisors'],
    queryFn: () => advisorApi.getAll().then(r => r.data?.data || r.data || []),
    staleTime: 30 * 1000,
  })

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => advisorApi.getDepartments().then(r => r.data?.data || r.data || []),
    staleTime: 5 * 60 * 1000,
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!advisorForm.fullName || !advisorForm.email || !advisorForm.departmentId)
        throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc')
      const payload = { ...advisorForm, departmentId: advisorForm.departmentId }
      return editingAdvisor
        ? advisorApi.update(editingAdvisor.advisorId, payload)
        : advisorApi.create(payload)
    },
    onSuccess: () => {
      toast.success('Lưu cố vấn thành công!')
      setShowModal(false)
      setAdvisorForm({ fullName: '', email: '', phone: '', departmentId: '', isActive: true })
      setEditingAdvisor(null)
      queryClient.invalidateQueries({ queryKey: ['advisors'] })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Lỗi khi lưu cố vấn')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => advisorApi.delete(id),
    onSuccess: () => {
      toast.success('Xóa cố vấn thành công!')
      queryClient.invalidateQueries({ queryKey: ['advisors'] })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Không thể xóa cố vấn')
    },
  })

  // Assign students mutation
  const assignMutation = useMutation({
    mutationFn: ({ advisorId, studentIds }) => advisorApi.assignStudents(advisorId, studentIds),
    onSuccess: () => {
      toast.success('Phân sinh viên thành công!')
      setShowAssignModal(false)
      setSelectedAdvisor(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Lỗi khi phân sinh viên')
    },
  })

  // Filter
  const filtered = advisors.filter(a => {
    const s = search.toLowerCase()
    const matchSearch = !s ||
      (a.fullName || '').toLowerCase().includes(s) ||
      (a.email || '').toLowerCase().includes(s) ||
      (a.advisorCode || '').toLowerCase().includes(s)
    const matchDept = !filterDept || a.departmentId === filterDept
    return matchSearch && matchDept
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function openAddModal() {
    setEditingAdvisor(null)
    setAdvisorForm({ fullName: '', email: '', phone: '', departmentId: '', isActive: true })
    setFormErrors({})
    setShowModal(true)
  }

  function openEditModal(adv) {
    setEditingAdvisor(adv)
    setAdvisorForm({
      fullName: adv.fullName || '',
      email: adv.email || '',
      phone: adv.phone || '',
      departmentId: adv.departmentId || '',
      isActive: adv.isActive ?? true,
    })
    setFormErrors({})
    setShowModal(true)
  }

  function validateForm() {
    const errs = {}
    if (!advisorForm.fullName) errs.fullName = 'Họ tên bắt buộc'
    if (!advisorForm.email) errs.email = 'Email bắt buộc'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(advisorForm.email)) errs.email = 'Email không hợp lệ'
    if (!advisorForm.departmentId) errs.departmentId = 'Vui lòng chọn bộ môn'
    return errs
  }

  function handleSave() {
    const errs = validateForm()
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    saveMutation.mutate()
  }

  function handleDelete(id) {
    if (!window.confirm('Bạn có chắc muốn xóa cố vấn này?')) return
    deleteMutation.mutate(id)
  }

  function openAssignModal(adv) {
    setSelectedAdvisor(adv)
    setShowAssignModal(true)
  }

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <input type="text" className="form-control" placeholder="Tìm kiếm theo tên, email, mã CV..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="filter-group">
          <select className="form-control" value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1) }}>
            <option value="">Tất cả bộ môn</option>
            {departments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openAddModal}>
            <i className="fas fa-plus"></i> Thêm CVHT
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã CVHT</th><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Bộ môn</th><th>SV phụ trách</th><th>Trạng thái</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="8" className="text-center"><i className="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan="8" className="text-center">Không có dữ liệu</td></tr>
                ) : (
                  paginated.map(a => (
                    <tr key={a.advisorId}>
                      <td><strong>{a.advisorCode}</strong></td>
                      <td>{a.fullName}</td>
                      <td>{a.email}</td>
                      <td>{a.phone}</td>
                      <td>{a.departmentName}</td>
                      <td>
                        <span className="badge badge-info">{a.studentCount ?? a.assignedStudents ?? 0}</span>
                      </td>
                      <td>
                        <span className={`badge ${a.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {a.isActive ? 'Hoạt động' : 'Khóa'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openAssignModal(a)} title="Phân SV">
                            <i className="fas fa-users"></i>
                          </button>
                          <button className="btn btn-sm btn-primary" onClick={() => openEditModal(a)}>
                            <i className="fas fa-edit"></i> Sửa
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a.advisorId)}>
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

      {/* Advisor Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{editingAdvisor ? 'Chỉnh sửa cố vấn' : 'Thêm cố vấn học tập'}</h4>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-3">
                <label>Họ tên <span className="text-danger">*</span></label>
                <input className={`form-control${formErrors.fullName ? ' is-invalid' : ''}`}
                  value={advisorForm.fullName}
                  onChange={e => setAdvisorForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Họ và tên đầy đủ" />
                {formErrors.fullName && <div className="invalid-feedback d-block">{formErrors.fullName}</div>}
              </div>
              <div className="form-group mb-3">
                <label>Email <span className="text-danger">*</span></label>
                <input className={`form-control${formErrors.email ? ' is-invalid' : ''}`}
                  type="email"
                  value={advisorForm.email}
                  onChange={e => setAdvisorForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@edu.vn" />
                {formErrors.email && <div className="invalid-feedback d-block">{formErrors.email}</div>}
              </div>
              <div className="form-group mb-3">
                <label>Số điện thoại</label>
                <input className="form-control"
                  value={advisorForm.phone}
                  onChange={e => setAdvisorForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="0xxxxxxxxx" />
              </div>
              <div className="form-group mb-3">
                <label>Bộ môn <span className="text-danger">*</span></label>
                <select className={`form-control${formErrors.departmentId ? ' is-invalid' : ''}`}
                  value={advisorForm.departmentId}
                  onChange={e => setAdvisorForm(f => ({ ...f, departmentId: e.target.value }))}>
                  <option value="">-- Chọn bộ môn --</option>
                  {departments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
                </select>
                {formErrors.departmentId && <div className="invalid-feedback d-block">{formErrors.departmentId}</div>}
              </div>
              {editingAdvisor && (
                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" id="advActive"
                    checked={advisorForm.isActive}
                    onChange={e => setAdvisorForm(f => ({ ...f, isActive: e.target.checked }))}
                    style={{ width: 40, height: 20, cursor: 'pointer' }} />
                  <label className="form-check-label" htmlFor="advActive">
                    {advisorForm.isActive ? 'Hoạt động' : 'Khóa'}
                  </label>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</> : <><i className="fas fa-save"></i> Lưu</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Students Modal */}
      {showAssignModal && selectedAdvisor && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h4>Phân sinh viên cho: {selectedAdvisor.fullName}</h4>
              <button className="btn-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="text-muted">Tính năng phân sinh viên cho cố vấn đang phát triển. Vui lòng liên hệ quản trị viên để được hỗ trợ.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
