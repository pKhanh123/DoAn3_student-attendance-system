import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import adminClassApi from '../../../api/adminClassApi'

interface ApiError {
  response?: {
    data?: {
      message?: string
    }
  }
}

interface AdminClassItem {
  adminClassId?: string
  classId?: string
  classCode?: string
  className?: string
  majorId?: string
  majorName?: string
  advisorId?: string
  advisorName?: string
  academicYearId?: string
  cohortYear?: number | string
  maxStudents?: number
  studentCount?: number
  currentStudents?: number
  description?: string
}

interface StudentItem {
  studentId: string
  studentCode?: string
  fullName?: string
  email?: string
}

interface MajorItem {
  majorId: string
  majorName: string
}

interface AdvisorItem {
  advisorId?: string
  lecturerId?: string
  fullName: string
}

interface AcademicYearItem {
  academicYearId: string
  yearName: string
}

interface AdminClassForm {
  classCode: string
  className: string
  majorId: string
  advisorId: string
  academicYearId: string
  cohortYear: number | string
  maxStudents: number | string
  description: string
}

interface FormErrors {
  classCode?: string
  className?: string
  majorId?: string
}

interface AdminClassesResponse {
  data: AdminClassItem[]
  totalCount: number
}

function getPages(currentPage: number, totalPages: number): number[] {
  const pages: number[] = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export default function AdminClassListPage(): React.JSX.Element {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState<string>('')
  const [filterMajor, setFilterMajor] = useState<string>('')
  const [filterCohort, setFilterCohort] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const pageSize = 10

  const [showFormModal, setShowFormModal] = useState<boolean>(false)
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false)
  const [editingClass, setEditingClass] = useState<AdminClassItem | null>(null)
  const [currentClass, setCurrentClass] = useState<AdminClassItem | null>(null)
  const [classStudents, setClassStudents] = useState<StudentItem[]>([])
  const [form, setForm] = useState<AdminClassForm>({
    classCode: '', className: '', majorId: '', advisorId: '',
    academicYearId: '', cohortYear: new Date().getFullYear(), maxStudents: 50, description: '',
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const { data: rawData = { data: [], totalCount: 0 }, isLoading } = useQuery<AdminClassesResponse>({
    queryKey: ['admin-classes', page, search, filterMajor, filterCohort],
    queryFn: () => {
      const params: Record<string, string | number> = { page, pageSize }
      if (search) params.search = search
      if (filterMajor) params.majorId = filterMajor
      if (filterCohort) params.cohortYear = filterCohort
      return adminClassApi.getAll(params).then((r: any) => {
        const d = r.data
        if (d?.success === false || d?.success === true) {
          return { data: (d?.data || []) as AdminClassItem[], totalCount: d?.totalCount || 0 }
        }
        return { data: (Array.isArray(d) ? d : (d?.data || [])) as AdminClassItem[], totalCount: d?.totalCount || 0 }
      })
    },
    staleTime: 30 * 1000,
  })
  const classes = rawData?.data || []
  const totalCount = rawData?.totalCount || classes.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const { data: majors = [] } = useQuery<MajorItem[]>({
    queryKey: ['majors'],
    queryFn: () => adminClassApi.getMajors().then((r: any) => (r.data?.data || r.data || []) as MajorItem[]),
    staleTime: 5 * 60 * 1000,
  })
  const { data: advisors = [] } = useQuery<AdvisorItem[]>({
    queryKey: ['lecturers-advisor'],
    queryFn: () => adminClassApi.getLecturers().then((r: any) => (r.data?.data || r.data || []) as AdvisorItem[]),
    staleTime: 5 * 60 * 1000,
  })
  const { data: academicYears = [] } = useQuery<AcademicYearItem[]>({
    queryKey: ['academic-years'],
    queryFn: () => adminClassApi.getAcademicYears().then((r: any) => (r.data?.data || r.data || []) as AcademicYearItem[]),
    staleTime: 5 * 60 * 1000,
  })

  const fetchClassStudents = (classId: string): void => {
    adminClassApi.getStudents(classId).then((r: any) => {
      const d = r.data
      setClassStudents(d?.success !== false ? (d?.data || d || []) as StudentItem[] : [])
    }).catch(() => setClassStudents([]))
  }

  const viewDetail = (c: AdminClassItem): void => {
    setCurrentClass(c)
    fetchClassStudents((c.adminClassId || c.classId) as string)
    setShowDetailModal(true)
  }

  const saveMutation = useMutation<unknown, ApiError, void>({
    mutationFn: () => {
      const payload = { ...form, maxStudents: Number(form.maxStudents) || 50 }
      return editingClass
        ? adminClassApi.update(editingClass.adminClassId || editingClass.classId, payload)
        : adminClassApi.create(payload)
    },
    onSuccess: () => {
      toast.success(`${editingClass ? 'Cập nhật' : 'Tạo'} lớp hành chính thành công!`)
      setShowFormModal(false)
      setEditingClass(null)
      setForm({ classCode: '', className: '', majorId: '', advisorId: '', academicYearId: '', cohortYear: new Date().getFullYear(), maxStudents: 50, description: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] })
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Lỗi khi lưu lớp'),
  })

  const deleteMutation = useMutation<unknown, ApiError, string>({
    mutationFn: (id) => adminClassApi.delete(id),
    onSuccess: () => {
      toast.success('Xóa lớp hành chính thành công!')
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] })
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Không thể xóa lớp'),
  })

  const removeStudentMutation = useMutation<unknown, ApiError, { classId: string; studentId: string }>({
    mutationFn: ({ classId, studentId }) => adminClassApi.removeStudent(classId, studentId),
    onSuccess: () => {
      toast.success('Đã xóa sinh viên khỏi lớp!')
      if (currentClass) fetchClassStudents((currentClass.adminClassId || currentClass.classId) as string)
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] })
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Lỗi khi xóa SV'),
  })

  function validateForm(): FormErrors {
    const errs: FormErrors = {}
    if (!form.classCode) errs.classCode = 'Mã lớp bắt buộc'
    if (!form.className) errs.className = 'Tên lớp bắt buộc'
    if (!form.majorId) errs.majorId = 'Vui lòng chọn ngành'
    return errs
  }

  function handleSave(): void {
    const errs = validateForm()
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    saveMutation.mutate()
  }

  function handleDelete(id: string): void {
    if (!window.confirm('Bạn có chắc muốn xóa lớp này?')) return
    deleteMutation.mutate(id)
  }

  function openCreate(): void {
    setEditingClass(null)
    setForm({ classCode: '', className: '', majorId: '', advisorId: '', academicYearId: '', cohortYear: new Date().getFullYear(), maxStudents: 50, description: '' })
    setFormErrors({})
    setShowFormModal(true)
  }

  function openEdit(c: AdminClassItem): void {
    setEditingClass(c)
    setForm({
      classCode: c.classCode || '',
      className: c.className || '',
      majorId: c.majorId || '',
      advisorId: c.advisorId || '',
      academicYearId: c.academicYearId || '',
      cohortYear: c.cohortYear || new Date().getFullYear(),
      maxStudents: c.maxStudents || 50,
      description: c.description || '',
    })
    setFormErrors({})
    setShowFormModal(true)
  }

  const safePage = Math.min(page, totalPages)
  const paginated = classes.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <input type="text" className="form-control" placeholder="Tìm kiếm theo mã, tên lớp..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="filter-group">
          <select className="form-control" value={filterMajor} onChange={(e) => { setFilterMajor(e.target.value); setPage(1) }}>
            <option value="">Tất cả ngành</option>
            {majors.map((m) => <option key={m.majorId} value={m.majorId}>{m.majorName}</option>)}
          </select>
          <select className="form-control" value={filterCohort} onChange={(e) => { setFilterCohort(e.target.value); setPage(1) }}>
            <option value="">Tất cả khóa</option>
            {[0,1,2,3,4,5,6,7,8,9].map((y) => {
              const yr = new Date().getFullYear() - y
              return <option key={yr} value={yr}>{yr}</option>
            })}
          </select>
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="fas fa-plus"></i> Thêm lớp HC
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã lớp</th><th>Tên lớp</th><th>Ngành</th><th>CVHT</th><th>Khóa</th><th>SV</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center"><i className="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={7} className="text-center">Không có dữ liệu</td></tr>
                ) : (
                  paginated.map((c) => (
                    <tr key={c.adminClassId || c.classId}>
                      <td><strong>{c.classCode}</strong></td>
                      <td>{c.className}</td>
                      <td>{c.majorName}</td>
                      <td>{c.advisorName || '—'}</td>
                      <td>{c.cohortYear}</td>
                      <td><span className="badge badge-info">{c.studentCount || c.currentStudents || 0}/{c.maxStudents}</span></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-sm btn-info" onClick={() => viewDetail(c)} title="Xem chi tiết">
                            <i className="fas fa-eye"></i>
                          </button>
                          <button className="btn btn-sm btn-primary" onClick={() => openEdit(c)}>
                            <i className="fas fa-edit"></i> Sửa
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete((c.adminClassId || c.classId) as string)}>
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
          {classes.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">Hiển thị {(safePage-1)*pageSize+1}–{Math.min(safePage*pageSize, classes.length)} / {totalCount}</div>
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

      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{editingClass ? 'Chỉnh sửa lớp hành chính' : 'Thêm lớp hành chính'}</h4>
              <button className="btn-close" onClick={() => setShowFormModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group col-md-6 mb-3">
                  <label>Mã lớp <span className="text-danger">*</span></label>
                  <input className={`form-control${formErrors.classCode ? ' is-invalid' : ''}`}
                    value={form.classCode}
                    onChange={(e) => setForm((f) => ({ ...f, classCode: e.target.value }))}
                    placeholder="VD: K23CNPM01" />
                  {formErrors.classCode && <div className="invalid-feedback d-block">{formErrors.classCode}</div>}
                </div>
                <div className="form-group col-md-6 mb-3">
                  <label>Tên lớp <span className="text-danger">*</span></label>
                  <input className={`form-control${formErrors.className ? ' is-invalid' : ''}`}
                    value={form.className}
                    onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
                    placeholder="VD: K23 CNPM Nhóm 1" />
                  {formErrors.className && <div className="invalid-feedback d-block">{formErrors.className}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group col-md-6 mb-3">
                  <label>Ngành <span className="text-danger">*</span></label>
                  <select className={`form-control${formErrors.majorId ? ' is-invalid' : ''}`}
                    value={form.majorId}
                    onChange={(e) => setForm((f) => ({ ...f, majorId: e.target.value }))}>
                    <option value="">-- Chọn ngành --</option>
                    {majors.map((m) => <option key={m.majorId} value={m.majorId}>{m.majorName}</option>)}
                  </select>
                  {formErrors.majorId && <div className="invalid-feedback d-block">{formErrors.majorId}</div>}
                </div>
                <div className="form-group col-md-6 mb-3">
                  <label>Cố vấn học tập</label>
                  <select className="form-control"
                    value={form.advisorId}
                    onChange={(e) => setForm((f) => ({ ...f, advisorId: e.target.value }))}>
                    <option value="">-- Chọn CVHT --</option>
                    {advisors.map((a) => <option key={a.advisorId || a.lecturerId} value={a.advisorId || a.lecturerId}>{a.fullName}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group col-md-4 mb-3">
                  <label>Năm học</label>
                  <select className="form-control"
                    value={form.academicYearId}
                    onChange={(e) => setForm((f) => ({ ...f, academicYearId: e.target.value }))}>
                    <option value="">-- Chọn --</option>
                    {academicYears.map((a) => <option key={a.academicYearId} value={a.academicYearId}>{a.yearName}</option>)}
                  </select>
                </div>
                <div className="form-group col-md-4 mb-3">
                  <label>Khóa</label>
                  <input className="form-control" type="number"
                    value={form.cohortYear}
                    onChange={(e) => setForm((f) => ({ ...f, cohortYear: e.target.value }))} />
                </div>
                <div className="form-group col-md-4 mb-3">
                  <label>SL tối đa</label>
                  <input className="form-control" type="number" min="1"
                    value={form.maxStudents}
                    onChange={(e) => setForm((f) => ({ ...f, maxStudents: e.target.value }))} />
                </div>
              </div>
              <div className="form-group mb-3">
                <label>Ghi chú</label>
                <textarea className="form-control"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</> : <><i className="fas fa-save"></i> Lưu</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && currentClass && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h4>Chi tiết lớp: {currentClass.className}</h4>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="row mb-3">
                <div className="col-md-4"><strong>Mã lớp:</strong> {currentClass.classCode}</div>
                <div className="col-md-4"><strong>Ngành:</strong> {currentClass.majorName}</div>
                <div className="col-md-4"><strong>Khóa:</strong> {currentClass.cohortYear}</div>
              </div>
              <div className="row mb-3">
                <div className="col-md-4"><strong>CVHT:</strong> {currentClass.advisorName || '—'}</div>
                <div className="col-md-4"><strong>SV:</strong> {currentClass.studentCount || 0}/{currentClass.maxStudents}</div>
                <div className="col-md-4"><strong>Ghi chú:</strong> {currentClass.description || '—'}</div>
              </div>
              <hr />
              <h6>Danh sách sinh viên ({classStudents.length})</h6>
              {classStudents.length === 0 ? (
                <p className="text-muted">Chưa có sinh viên trong lớp.</p>
              ) : (
                <table className="table table-sm table-bordered">
                  <thead className="table-light"><tr><th>Mã SV</th><th>Họ tên</th><th>Email</th><th></th></tr></thead>
                  <tbody>
                    {classStudents.map((s) => (
                      <tr key={s.studentId}>
                        <td>{s.studentCode}</td>
                        <td>{s.fullName}</td>
                        <td>{s.email}</td>
                        <td>
                          <button className="btn btn-sm btn-danger" onClick={() => {
                            if (window.confirm('Xóa sinh viên khỏi lớp?')) {
                              removeStudentMutation.mutate({ classId: (currentClass.adminClassId || currentClass.classId) as string, studentId: s.studentId })
                            }
                          }}>
                            <i className="fas fa-times"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
