import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import subjectApi from '../../../api/subjectApi'

interface ApiError {
  validation?: FormErrors
  response?: {
    data?: {
      message?: string
    }
  }
}

interface Pagination {
  totalPages?: number
  totalCount?: number
}

interface SubjectItem {
  subjectId: string
  subjectCode?: string
  subjectName?: string
  credits?: number
  departmentId?: string
  departmentName?: string
  description?: string
  isActive?: boolean
}

interface DepartmentItem {
  departmentId: string
  departmentName: string
}

interface SubjectForm {
  subjectCode: string
  subjectName: string
  credits: number | string
  departmentId: string
  description: string
  isActive: boolean
}

interface FormErrors {
  subjectCode?: string
  subjectName?: string
  departmentId?: string
}

interface SubjectQueryData {
  data: SubjectItem[]
  pagination: Pagination
}

function getPages(currentPage: number, totalPages: number): number[] {
  const pages: number[] = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export default function SubjectListPage(): React.JSX.Element {
  const navigate = useNavigate()
  void navigate
  const queryClient = useQueryClient()

  const [search, setSearch] = useState<string>('')
  const [filterDept, setFilterDept] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const pageSize = 10

  const [showModal, setShowModal] = useState<boolean>(false)
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null)
  const [form, setForm] = useState<SubjectForm>({
    subjectCode: '', subjectName: '', credits: 3,
    departmentId: '', description: '', isActive: true,
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const { data: rawData = { data: [], pagination: {} }, isLoading } = useQuery<SubjectQueryData>({
    queryKey: ['subjects', page, search, filterDept],
    queryFn: () => {
      const params: Record<string, string | number> = { page, pageSize }
      if (search) params.search = search
      if (filterDept) params.departmentId = filterDept
      return subjectApi.getAll(params).then((r: any) => {
        const d = r.data
        if (Array.isArray(d)) return { data: d as SubjectItem[], pagination: {} }
        return { data: (d?.data || d?.items || []) as SubjectItem[], pagination: (d?.pagination || {}) as Pagination }
      })
    },
    staleTime: 30 * 1000,
  })
  const subjects = rawData?.data || []
  const pagination = rawData?.pagination || {}

  const { data: departments = [] } = useQuery<DepartmentItem[]>({
    queryKey: ['departments'],
    queryFn: () => subjectApi.getDepartments().then((r: any) => (r.data?.data || r.data || []) as DepartmentItem[]),
    staleTime: 5 * 60 * 1000,
  })

  const saveMutation = useMutation<unknown, ApiError, void>({
    mutationFn: () => {
      const errs = validateForm()
      if (Object.keys(errs).length > 0) throw { validation: errs }
      const payload = { ...form, credits: Number(form.credits) || 3 }
      return editingSubject
        ? subjectApi.update(editingSubject.subjectId, payload)
        : subjectApi.create(payload)
    },
    onSuccess: () => {
      toast.success(`${editingSubject ? 'Cập nhật' : 'Thêm'} môn học thành công!`)
      setShowModal(false)
      setEditingSubject(null)
      setForm({ subjectCode: '', subjectName: '', credits: 3, departmentId: '', description: '', isActive: true })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
    onError: (error) => {
      if (error.validation) { setFormErrors(error.validation); return }
      toast.error(error.response?.data?.message || 'Lỗi khi lưu môn học')
    },
  })

  const deleteMutation = useMutation<unknown, ApiError, string>({
    mutationFn: (id) => subjectApi.delete(id),
    onSuccess: () => {
      toast.success('Xóa môn học thành công!')
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Không thể xóa môn học'),
  })

  function validateForm(): FormErrors {
    const errs: FormErrors = {}
    if (!form.subjectCode) errs.subjectCode = 'Mã môn bắt buộc'
    if (!form.subjectName) errs.subjectName = 'Tên môn bắt buộc'
    if (!form.departmentId) errs.departmentId = 'Vui lòng chọn bộ môn'
    return errs
  }

  function handleSave(): void {
    const errs = validateForm()
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    saveMutation.mutate()
  }

  function handleDelete(id: string): void {
    if (!window.confirm('Bạn có chắc muốn xóa môn học này?')) return
    deleteMutation.mutate(id)
  }

  function openCreate(): void {
    setEditingSubject(null)
    setForm({ subjectCode: '', subjectName: '', credits: 3, departmentId: '', description: '', isActive: true })
    setFormErrors({})
    setShowModal(true)
  }

  function openEdit(s: SubjectItem): void {
    setEditingSubject(s)
    setForm({
      subjectCode: s.subjectCode || '',
      subjectName: s.subjectName || '',
      credits: s.credits || 3,
      departmentId: s.departmentId || '',
      description: s.description || '',
      isActive: s.isActive ?? true,
    })
    setFormErrors({})
    setShowModal(true)
  }

  const totalPages = Math.max(1, pagination.totalPages || Math.ceil(subjects.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = subjects.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <input type="text" className="form-control" placeholder="Tìm kiếm theo mã, tên môn..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="filter-group">
          <select className="form-control" value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setPage(1) }}>
            <option value="">Tất cả bộ môn</option>
            {departments.map((d) => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="fas fa-plus"></i> Thêm môn
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã môn</th><th>Tên môn</th><th>Tín chỉ</th><th>Bộ môn</th><th>Trạng thái</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center"><i className="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={6} className="text-center">Không có dữ liệu</td></tr>
                ) : (
                  paginated.map((s) => (
                    <tr key={s.subjectId}>
                      <td><strong>{s.subjectCode}</strong></td>
                      <td>{s.subjectName}</td>
                      <td>{s.credits}</td>
                      <td>{s.departmentName}</td>
                      <td>
                        <span className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {s.isActive ? 'Hoạt động' : 'Khóa'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-sm btn-primary" onClick={() => openEdit(s)}>
                            <i className="fas fa-edit"></i> Sửa
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.subjectId)}>
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
          {subjects.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Hiển thị {(safePage-1)*pageSize+1}–{Math.min(safePage*pageSize, subjects.length)} / {pagination.totalCount || subjects.length}
              </div>
              <div className="pagination">
                <button className="btn btn-sm" onClick={() => setPage((p) => Math.max(1,p-1))} disabled={safePage===1}>
                  <i className="fas fa-chevron-left"></i> Trước
                </button>
                {getPages(safePage, totalPages).map((p) => (
                  <button key={p} className={`btn btn-sm ${p===safePage?'btn-primary':'btn-outline'}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="btn btn-sm" onClick={() => setPage((p) => Math.min(totalPages,p+1))} disabled={safePage===totalPages}>
                  Sau <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{editingSubject ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}</h4>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group col-md-6 mb-3">
                  <label>Mã môn <span className="text-danger">*</span></label>
                  <input className={`form-control${formErrors.subjectCode ? ' is-invalid' : ''}`}
                    value={form.subjectCode}
                    onChange={(e) => setForm((f) => ({ ...f, subjectCode: e.target.value }))}
                    placeholder="VD: CNPM" />
                  {formErrors.subjectCode && <div className="invalid-feedback d-block">{formErrors.subjectCode}</div>}
                </div>
                <div className="form-group col-md-6 mb-3">
                  <label>Số tín chỉ</label>
                  <input className="form-control" type="number" min="1" max="20"
                    value={form.credits}
                    onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))} />
                </div>
              </div>
              <div className="form-group mb-3">
                <label>Tên môn <span className="text-danger">*</span></label>
                <input className={`form-control${formErrors.subjectName ? ' is-invalid' : ''}`}
                  value={form.subjectName}
                  onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))}
                  placeholder="VD: Công nghệ phần mềm" />
                {formErrors.subjectName && <div className="invalid-feedback d-block">{formErrors.subjectName}</div>}
              </div>
              <div className="form-group mb-3">
                <label>Bộ môn <span className="text-danger">*</span></label>
                <select className={`form-control${formErrors.departmentId ? ' is-invalid' : ''}`}
                  value={form.departmentId}
                  onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
                  <option value="">-- Chọn bộ môn --</option>
                  {departments.map((d) => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
                </select>
                {formErrors.departmentId && <div className="invalid-feedback d-block">{formErrors.departmentId}</div>}
              </div>
              <div className="form-group mb-3">
                <label>Mô tả</label>
                <textarea className="form-control"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Mô tả môn học..." />
              </div>
              {editingSubject && (
                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" id="subjActive"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    style={{ width: 40, height: 20, cursor: 'pointer' }} />
                  <label className="form-check-label" htmlFor="subjActive">
                    {form.isActive ? 'Hoạt động' : 'Khóa'}
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
    </div>
  )
}
